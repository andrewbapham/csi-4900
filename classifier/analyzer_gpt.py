from openai import OpenAI
from dotenv import load_dotenv
import os
import json

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

system_prompt = """
After comparing the image input with the annotation data in the JSON file, please output based on the following rules:
1. If the JSON file is consistent with the image input, output "consistent"
2. If the JSON file has incorrect annotations, output the specific details of the incorrect annotations, example:
- Incorrect annotation: {annotation_key}
- Correct annotation: {correct_annotation}
- Image input: {image_input}
- JSON file: {json_file}
3. If the JSON file has missing annotations, output the specific details of the missing annotations, example:
- Missing annotation: {missing_annotation}
"""


def create_file(file_path, purpose="vision"):
    """Create a file with the Files API"""
    with open(file_path, "rb") as file_content:
        result = client.files.create(file=file_content, purpose=purpose)
        return result.id


# Create files for both image and JSON
image_path = "test_data/f82itz69069z_LC7xM6UIA.jpg"
json_path = "test_data/f82itz69069z_LC7xM6UIA.json"

image_file_id = create_file(image_path, purpose="vision")
json_file_id = create_file(
    json_path, purpose="assistants"
)  # JSON files use "assistants" purpose

print(f"Analyzing image: {image_path}")
print(f"With JSON file: {json_path}")
print("Making API request...")

response = client.responses.create(
    model="gpt-4o",
    input=[
        {
            "role": "user",
            "content": [
                {
                    "type": "input_text",
                    "text": """Process this image input and compare it with the annotation data in the JSON file.
                    {system_prompt}""",
                },
                {"type": "input_image", "file_id": image_file_id, "detail": "high"},
                {"type": "input_file", "file_id": json_file_id},
            ],
        }
    ],
)

# Display response
print(response.output_text)

# Display token usage
print("\n" + "=" * 50)
print("TOKEN USAGE")
print("=" * 50)
print(f"Input tokens:    {response.usage.input_tokens:,}")
print(f"Output tokens:   {response.usage.output_tokens:,}")
print(f"Total tokens:    {response.usage.total_tokens:,}")
