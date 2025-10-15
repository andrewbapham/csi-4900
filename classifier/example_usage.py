#!/usr/bin/env python3
"""
Example usage of the parallel Gemini analyzer
"""

from parallel_analyzer import ParallelGeminiAnalyzer
import os


def main():
    # Example 1: Analyze all pairs in the images directory
    print("=== Example 1: Analyze all pairs ===")

    analyzer = ParallelGeminiAnalyzer(
        max_workers=3,  # Use 3 workers for demo
        rate_limit_delay=0.2,  # 200ms delay between requests
    )

    images_dir = "../scrape/images"

    # Process first 5 pairs as a test
    pairs = analyzer.find_image_json_pairs(images_dir)
    test_pairs = pairs[:5]  # Just first 5 for demo

    print(f"Found {len(pairs)} total pairs, processing first {len(test_pairs)} as demo")

    results = analyzer.analyze_specific_pairs(
        test_pairs, output_file="demo_results.json"
    )

    # Print results
    for result in results:
        print(f"\n--- {result.image_id} ---")
        print(f"Success: {result.success}")
        print(f"Time: {result.processing_time:.2f}s")
        if result.success:
            print(f"Result: {result.result}")
        else:
            print(f"Error: {result.error}")

    # Example 2: Analyze specific pairs
    print("\n\n=== Example 2: Analyze specific pairs ===")

    # You can also specify exact pairs to analyze
    specific_pairs = [
        (
            "506325294076044",
            "../scrape/images/506325294076044/506325294076044.jpg",
            "../scrape/images/506325294076044/506325294076044.json",
        ),
        # Add more specific pairs as needed
    ]

    if os.path.exists("../scrape/images/506325294076044/506325294076044.jpg"):
        results = analyzer.analyze_specific_pairs(specific_pairs)

        for result in results:
            print(f"\n--- {result.image_id} ---")
            print(f"Success: {result.success}")
            if result.success:
                print(f"Result: {result.result}")


if __name__ == "__main__":
    main()
