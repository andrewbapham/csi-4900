from google import genai
from google.genai import types
from dotenv import load_dotenv
import os
import json

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Create files for both image and JSON
image_path = "test_data/f82itz69069z_LC7xM6UIA.jpg"
json_path = "test_data/f82itz69069z_LC7xM6UIA.json"

image_file = client.files.upload(file=image_path)

# Load JSON data
with open(json_path, "r") as f:
    json_data = json.load(f)

system_prompt = """
After comparing the image input with the annotation data in the JSON file, please output based on the following rules:
1. If the JSON file is consistent with the image input, only output the word "consistent"
2. Return a list of annotations with the format {key: {key}, label: {label}} for the following cases:
    - Incorrect annotations (wrong label for a sign)
    - Missing annotations from the JSON file (missing a sign)
    - Annotations with the label "other-sign"
"""


def create_file(file_path, purpose="vision"):
    """Create a file with the Files API"""
    with open(file_path, "rb") as file_content:
        result = client.files.create(file=file_content, purpose=purpose)
        return result.id


print(f"Analyzing image: {image_path}")
print(f"With JSON file: {json_path}")
print("Making API request...")

response = client.models.generate_content(
    model="gemini-2.5-flash",
    config=types.GenerateContentConfig(
        system_instruction=system_prompt),
    contents=[
        image_file,
        f"Analyze the image input and compare it with the following JSON input: {json.dumps(json_data, indent=2)}",
    ],
)

# Display response
print(response.text)

# Display token usage
print("\n" + "=" * 50)
print("TOKEN USAGE")
print("=" * 50)
print(response.usage_metadata)
