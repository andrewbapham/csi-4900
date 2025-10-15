import asyncio
import json
import os
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from dataclasses import dataclass
from google import genai
from google.genai import types
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv()


@dataclass
class AnalysisResult:
    """Result of analyzing an image/JSON pair"""

    image_id: str
    result: str
    success: bool
    error: Optional[str] = None
    processing_time: float = 0.0


class ParallelGeminiAnalyzer:
    """Parallel analyzer for processing image/JSON pairs with Gemini API"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        max_workers: int = 5,
        rate_limit_delay: float = 0.1,
    ):
        """
        Initialize the parallel analyzer

        Args:
            api_key: Gemini API key (defaults to GEMINI_API_KEY env var)
            max_workers: Maximum number of concurrent workers
            rate_limit_delay: Delay between API calls to respect rate limits
        """
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY must be provided or set in environment")

        self.client = genai.Client(api_key=self.api_key)
        self.max_workers = max_workers
        self.rate_limit_delay = rate_limit_delay

        self.system_prompt = """
After comparing the image input with the annotation data in the JSON file, please output based on the following rules:
1. If the JSON file is consistent with the image input, only output the word "consistent"
2. Return a list of annotations with the format {key: {key}, label: {label}} for the following cases:
   - Incorrect annotations (wrong label for a sign)
   - Missing annotations from the JSON file (missing a sign)
   - Annotations with the label "other-sign"
"""

    def find_image_json_pairs(self, images_dir: str) -> List[Tuple[str, str, str]]:
        """
        Find all image/JSON pairs in the images directory

        Args:
            images_dir: Path to the images directory containing subdirectories

        Returns:
            List of tuples (image_id, image_path, json_path)
        """
        pairs = []
        images_path = Path(images_dir)

        if not images_path.exists():
            raise FileNotFoundError(f"Images directory not found: {images_dir}")

        for subdir in images_path.iterdir():
            if not subdir.is_dir():
                continue

            image_id = subdir.name
            image_path = subdir / f"{image_id}.jpg"
            json_path = subdir / f"{image_id}.json"

            if image_path.exists() and json_path.exists():
                pairs.append((image_id, str(image_path), str(json_path)))
            else:
                logger.warning(
                    f"Missing files for {image_id}: image={image_path.exists()}, json={json_path.exists()}"
                )

        logger.info(f"Found {len(pairs)} image/JSON pairs")
        return pairs

    def analyze_single_pair(
        self, image_id: str, image_path: str, json_path: str
    ) -> AnalysisResult:
        """
        Analyze a single image/JSON pair

        Args:
            image_id: Unique identifier for the image
            image_path: Path to the image file
            json_path: Path to the JSON file

        Returns:
            AnalysisResult containing the analysis outcome
        """
        start_time = time.time()

        try:
            # Upload image file
            image_file = self.client.files.upload(file=image_path)

            # Load JSON data
            with open(json_path, "r") as f:
                json_data = json.load(f)

            # Add rate limiting delay
            time.sleep(self.rate_limit_delay)

            # Make API request
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt
                ),
                contents=[
                    image_file,
                    f"Analyze the image input and compare it with the following JSON input: {json.dumps(json_data, indent=2)}",
                ],
            )

            processing_time = time.time() - start_time

            return AnalysisResult(
                image_id=image_id,
                result=response.text,
                success=True,
                processing_time=processing_time,
            )

        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Error analyzing {image_id}: {str(e)}")

            return AnalysisResult(
                image_id=image_id,
                result="",
                success=False,
                error=str(e),
                processing_time=processing_time,
            )

    def analyze_batch_parallel(
        self, images_dir: str, output_file: Optional[str] = None
    ) -> List[AnalysisResult]:
        """
        Analyze all image/JSON pairs in parallel

        Args:
            images_dir: Path to the images directory
            output_file: Optional path to save results as JSON

        Returns:
            List of AnalysisResult objects
        """
        pairs = self.find_image_json_pairs(images_dir)

        if not pairs:
            logger.warning("No image/JSON pairs found")
            return []

        results = []

        logger.info(
            f"Starting parallel analysis of {len(pairs)} pairs with {self.max_workers} workers"
        )

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_pair = {
                executor.submit(
                    self.analyze_single_pair, image_id, image_path, json_path
                ): (image_id, image_path, json_path)
                for image_id, image_path, json_path in pairs
            }

            # Process completed tasks
            for i, future in enumerate(as_completed(future_to_pair), 1):
                image_id, image_path, json_path = future_to_pair[future]

                try:
                    result = future.result()
                    results.append(result)

                    status = "✓" if result.success else "✗"
                    logger.info(
                        f"[{i}/{len(pairs)}] {status} {image_id} ({result.processing_time:.2f}s)"
                    )

                    if result.success:
                        logger.info(
                            f"Result: {result.result[:100]}{'...' if len(result.result) > 100 else ''}"
                        )
                    else:
                        logger.error(f"Error: {result.error}")

                except Exception as e:
                    logger.error(f"Unexpected error processing {image_id}: {str(e)}")
                    results.append(
                        AnalysisResult(
                            image_id=image_id,
                            result="",
                            success=False,
                            error=f"Unexpected error: {str(e)}",
                        )
                    )

        # Save results if output file specified
        if output_file:
            self.save_results(results, output_file)

        # Print summary
        successful = sum(1 for r in results if r.success)
        failed = len(results) - successful
        avg_time = (
            sum(r.processing_time for r in results) / len(results) if results else 0
        )

        logger.info(
            f"Analysis complete: {successful} successful, {failed} failed, avg time: {avg_time:.2f}s"
        )

        return results

    def save_results(self, results: List[AnalysisResult], output_file: str):
        """Save analysis results to a JSON file"""
        output_data = []

        for result in results:
            output_data.append(
                {
                    "image_id": result.image_id,
                    "result": result.result,
                    "success": result.success,
                    "error": result.error,
                    "processing_time": result.processing_time,
                }
            )

        with open(output_file, "w") as f:
            json.dump(output_data, f, indent=2)

        logger.info(f"Results saved to {output_file}")

    def analyze_specific_pairs(
        self, pairs: List[Tuple[str, str, str]], output_file: Optional[str] = None
    ) -> List[AnalysisResult]:
        """
        Analyze specific image/JSON pairs

        Args:
            pairs: List of tuples (image_id, image_path, json_path)
            output_file: Optional path to save results as JSON

        Returns:
            List of AnalysisResult objects
        """
        if not pairs:
            logger.warning("No pairs provided")
            return []

        results = []

        logger.info(
            f"Starting parallel analysis of {len(pairs)} specific pairs with {self.max_workers} workers"
        )

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_pair = {
                executor.submit(
                    self.analyze_single_pair, image_id, image_path, json_path
                ): (image_id, image_path, json_path)
                for image_id, image_path, json_path in pairs
            }

            # Process completed tasks
            for i, future in enumerate(as_completed(future_to_pair), 1):
                image_id, image_path, json_path = future_to_pair[future]

                try:
                    result = future.result()
                    results.append(result)

                    status = "✓" if result.success else "✗"
                    logger.info(
                        f"[{i}/{len(pairs)}] {status} {image_id} ({result.processing_time:.2f}s)"
                    )

                except Exception as e:
                    logger.error(f"Unexpected error processing {image_id}: {str(e)}")
                    results.append(
                        AnalysisResult(
                            image_id=image_id,
                            result="",
                            success=False,
                            error=f"Unexpected error: {str(e)}",
                        )
                    )

        # Save results if output file specified
        if output_file:
            self.save_results(results, output_file)

        return results


def main():
    """Example usage of the parallel analyzer"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Parallel Gemini API analyzer for image/JSON pairs"
    )
    parser.add_argument(
        "images_dir", help="Directory containing image/JSON pair subdirectories"
    )
    parser.add_argument("--output", "-o", help="Output file for results (JSON format)")
    parser.add_argument(
        "--workers", "-w", type=int, default=5, help="Number of parallel workers"
    )
    parser.add_argument(
        "--rate-limit",
        "-r",
        type=float,
        default=0.1,
        help="Delay between API calls (seconds)",
    )
    parser.add_argument(
        "--limit", "-l", type=int, help="Limit number of pairs to process (for testing)"
    )

    args = parser.parse_args()

    # Initialize analyzer
    analyzer = ParallelGeminiAnalyzer(
        max_workers=args.workers, rate_limit_delay=args.rate_limit
    )

    # Find pairs
    pairs = analyzer.find_image_json_pairs(args.images_dir)

    # Limit pairs if specified
    if args.limit:
        pairs = pairs[: args.limit]
        logger.info(f"Limited to first {args.limit} pairs")

    # Run analysis
    results = analyzer.analyze_specific_pairs(pairs, args.output)

    # Print summary
    successful = sum(1 for r in results if r.success)
    failed = len(results) - successful

    print(f"\nSUMMARY:")
    print(f"Total processed: {len(results)}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")

    if successful > 0:
        print(f"\nSample successful results:")
        for result in [r for r in results if r.success][:3]:
            print(
                f"  {result.image_id}: {result.result[:100]}{'...' if len(result.result) > 100 else ''}"
            )


if __name__ == "__main__":
    main()
