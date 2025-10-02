"""
Script to extract filenames (without extensions) from a directory and save them to a text file.

Usage:
    python extract_filenames.py <input_directory> <output_file>

Arguments:
    input_directory: Path to the directory containing files
    output_file: Path to the output text file to create
"""

import os
import sys
from pathlib import Path


def extract_filenames(input_dir, output_file):
    """
    Extract all filenames (without extensions) from the input directory
    and write them to the output file.

    Args:
        input_dir (str): Path to the input directory
        output_file (str): Path to the output text file
    """
    input_path = Path(input_dir)

    # Check if input directory exists
    if not input_path.exists():
        print(f"Error: Directory '{input_dir}' does not exist.")
        sys.exit(1)

    if not input_path.is_dir():
        print(f"Error: '{input_dir}' is not a directory.")
        sys.exit(1)

    # Get all files in the directory (not subdirectories)
    filenames = []
    for file_path in input_path.iterdir():
        if file_path.is_file():
            # Get filename without extension
            filename_without_ext = file_path.stem
            filenames.append(filename_without_ext)

    # Sort filenames for consistent output
    filenames.sort()

    # Write to output file
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            for filename in filenames:
                f.write(filename + "\n")

        print(f"Successfully extracted {len(filenames)} filenames to '{output_file}'")

    except Exception as e:
        print(f"Error writing to output file '{output_file}': {e}")
        sys.exit(1)


def main():
    """Main function to handle command line arguments and execute the script."""
    if len(sys.argv) != 3:
        print("Usage: python extract_filenames.py <input_directory> <output_file>")
        print("\nArguments:")
        print("  input_directory: Path to the directory containing files")
        print("  output_file: Path to the output text file to create")
        sys.exit(1)

    input_directory = sys.argv[1]
    output_file = sys.argv[2]

    extract_filenames(input_directory, output_file)


if __name__ == "__main__":
    main()
