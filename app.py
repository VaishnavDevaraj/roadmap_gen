# app.py - Python Flask Backend - Direct Groq Key for Dev
import random
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import os
import json
from groq import Groq # Import the Groq client

app = Flask(__name__)
CORS(app)

# --- Initialize Groq client ---
# IMPORTANT: FOR LOCAL DEVELOPMENT ONLY, PASTE YOUR GROQ API KEY DIRECTLY HERE.
# DO NOT COMMIT YOUR API KEY TO VERSION CONTROL (e.g., GitHub).
# FOR PRODUCTION DEPLOYMENT, ALWAYS USE os.environ.get("GROQ_API_KEY").
import os # Make sure 'import os' is at the top of the file

# --- Initialize Groq client ---
try:
    # The API key is now fetched from an environment variable
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY environment variable not set.")

    groq_client = Groq(api_key=groq_api_key)
    print("Groq client initialized successfully.")
except Exception as e:
    print(f"Error initializing Groq client: {e}")
    groq_client = None

# --- LLM Logic using Groq API ---
# This function is now fully synchronous.
def generate_roadmap_with_groq(user_data):
    """
    Generates a personalized learning roadmap using the Groq API.
    This version makes a synchronous call to the Groq API.
    """
    if not groq_client:
        raise Exception("Groq API client not initialized. Cannot generate roadmap.")

    knowledge_level = user_data.get('knowledgeLevel', 'unknown')
    career_aspiration = user_data.get('careerAspirations', 'a technology professional')
    available_time_per_day = user_data.get('availableTimePerDay', 2)

    response_schema = {
        "type": "object",
        "properties": {
            "path": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                        "estimated_time_days": {"type": "integer"},
                        "type": {"type": "string", "enum": ["concept", "project", "assessment", "info"]}
                    },
                    "required": ["title", "description", "estimated_time_days", "type"]
                }
            },
            "total_estimated_days": {"type": "integer"}
        },
        "required": ["path", "total_estimated_days"]
    }

    prompt_text = f"""
    You are an expert career coach and personalized learning path generator.
    Your task is to create a hyper-personalized, step-by-step learning roadmap for an individual.
    The roadmap MUST be provided in a strict JSON format matching the following schema:
    {json.dumps(response_schema, indent=2)}

    Here are the user's details:
    - **Current Knowledge Level:** "{knowledge_level}"
    - **Career Aspiration/Goal:** "{career_aspiration}"
    - **Hours per day available for study:** {available_time_per_day}

    Based on these details, generate a comprehensive learning path with the following characteristics:
    1.  **Personalization:**
        * **Adapt to Knowledge Level:** If the user has 'advanced' knowledge in a topic, suggest starting from intermediate/advanced modules, focusing on deeper concepts or skipping known basics. If 'beginner' or 'no experience', include foundational prerequisites and basic explanations.
        * **Consider Time:** The `estimated_time_days` for each step should be scaled based on `available_time_per_day`. Assume a baseline effort of 4 hours/day for the "typical" duration of a topic. If a user has less time, the days for each step should increase. If more time, days should decrease.
        * **Include Tools/Frameworks/Techniques:** For each "concept" or "project" step, explicitly mention relevant tools, frameworks, libraries, specific technologies, and key techniques to learn in the `description`. Make it actionable and practical (e.g., "Use Python, Pandas, and Matplotlib").
    2.  **Structure and Content:**
        * Break down complex topics into digestible sub-topics.
        * Include a mix of "concept" (theoretical learning), "project" (hands-on application), and "assessment" (knowledge check) type steps.
        * Suggest practical project ideas to apply learned concepts.
        * Ensure a logical flow and progression through the topics, building upon previous steps.
        * The roadmap should have between 5 and 10 distinct steps.
    3.  **Robustness for Unclear Aspirations:** If the 'Career Aspiration' is broad (e.g., "Software Developer") or very niche/unrecognized, infer a plausible general technology learning path and use general but relevant terms.
    4.  **Final Calculation:** Calculate the `total_estimated_days` for the entire generated path based on the summed `estimated_time_days` of each step.

    Ensure the response is ONLY the JSON object, with no conversational text or markdown outside the JSON.
    """

    print(f"Sending prompt to Groq API for aspiration: '{career_aspiration}'")
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert career coach generating personalized learning roadmaps in strict JSON format."
                },
                {
                    "role": "user",
                    "content": prompt_text
                }
            ],
            model="llama3-8b-8192",
            response_format={"type": "json_object"},
            temperature=0.0,
            max_tokens=2048
        )

        response_content = chat_completion.choices[0].message.content
        print(f"Received raw response from Groq: {response_content[:500]}...")
        
        llm_response_data = json.loads(response_content)

        if "path" not in llm_response_data or "total_estimated_days" not in llm_response_data:
            raise ValueError("LLM response missing 'path' or 'total_estimated_days' keys.")

        final_processed_path = []
        for step in llm_response_data["path"]:
            processed_step = step.copy() 
            if not isinstance(processed_step.get("estimated_time_days"), int) or processed_step["estimated_time_days"] <= 0:
                processed_step["estimated_time_days"] = 1
            
            if not re.match(r'^\d+\.', processed_step.get("title", "")):
                processed_step["title"] = f"{llm_response_data['path'].index(step) + 1}. {processed_step['title']}"
            
            if "description" not in processed_step or not processed_step["description"]:
                processed_step["description"] = f"Learn about {processed_step['title']}."

            final_processed_path.append(processed_step)
        
        llm_response_data["path"] = final_processed_path
        
        calculated_total_days = sum(step["estimated_time_days"] for step in llm_response_data["path"])
        llm_response_data["total_estimated_days"] = calculated_total_days


        return llm_response_data

    except json.JSONDecodeError as e:
        print(f"JSON decoding error from Groq response: {e}")
        print(f"Faulty response content: {response_content}")
        raise Exception(f"Failed to parse Groq API response: Invalid JSON. Details: {e}")
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        raise Exception(f"Error communicating with Groq API: {e}")

@app.route('/', methods=['GET'])
def home():
    return "Learning Path Backend is running!", 200

@app.route('/generate-learning-path', methods=['POST'])
def generate_path():
    try:
        if groq_client is None:
            return jsonify({'error': 'Backend not configured: Groq API key is missing or invalid.'}), 500

        user_data = request.get_json()
        if not user_data:
            return jsonify({'error': 'Invalid request: No JSON data provided'}), 400

        print(f"Received request: {user_data}")
        time.sleep(random.uniform(1.0, 2.5))
        response_data = generate_roadmap_with_groq(user_data) 

        return jsonify(response_data)

    except Exception as e:
        print(f"Error processing request: {e}")
        import traceback
        traceback.print_exc() 
        return jsonify({'error': 'An internal server error occurred', 'details': str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask server with Groq API integration on http://0.0.0.0:5000")
    print("Ensure you have 'groq' installed: pip install groq")
    print("Ensure GROQ_API_KEY is correctly set in app.py for local development.")
    app.run(debug=True, host='0.0.0.0', port=5000)

