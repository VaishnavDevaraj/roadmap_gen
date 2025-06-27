# roadmap_gen
AI Personalized Learning Roadmap GeneratorA full-stack web application that uses AI to generate a personalized, step-by-step learning roadmap based on your current knowledge and career aspirations.View the Live Demo About The ProjectThis project was built to solve a common problem for aspiring developers and professionals: "What should I learn next?" Instead of following a generic guide, this tool provides a tailored learning path, taking into account what you already know, what you want to become, and how much time you can dedicate daily.The application works by:Collecting your current skills, career goal, and available study time through a simple web form.Sending this information to a Python Flask backend.The backend then queries the Groq API (using the Llama 3 model) to generate a detailed, structured learning plan in JSON format.The frontend receives this plan and dynamically renders it as a beautiful, interactive SVG diagram that you can pan, zoom, download, and print.Key FeaturesAI-Powered Personalization: Creates roadmaps that are unique to each user's input.Interactive SVG Diagram: Visualizes the learning path with pan and zoom functionality.Downloadable Assets: Allows you to download the roadmap as a high-quality PNG or SVG file.Print-Friendly: Easily print the roadmap for offline reference.Responsive Design: Fully functional on both desktop and mobile devices.Technology StackThis project is built with a modern, full-stack approach:Frontend:HTML5CSS3Vanilla JavaScript (for DOM manipulation, API calls, and SVG rendering)Backend:Python 3Flask (as the web framework)Gunicorn (as the production web server)AI Service:Groq API (for fast inference with the Llama 3 model)Deployment:Frontend: Deployed on NetlifyBackend: Deployed on RenderGetting Started (Local Setup)To get a local copy up and running, follow these steps.PrerequisitesYou will need Git and Python 3 installed on your machine.1. Backend Setup# Clone the repository
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install Python dependencies
pip install -r requirements.txt

# Set up your environment variable for the Groq API key
# On Mac/Linux:
export GROQ_API_KEY="your_actual_groq_api_key"
# On Windows (Command Prompt):
set GROQ_API_KEY="your_actual_groq_api_key"

# Run the Flask server (it will run on http://127.0.0.1:5000)
python app.py
2. Frontend SetupThe frontend is a static site, but it needs to be served from a local server to properly communicate with the backend API.Update the API URL for Local Development:Open script.js.Make sure the API_URL variable is pointing to your local backend server:const API_URL = 'http://127.0.0.1:5000/generate-learning-path';
Serve the Frontend:The easiest way is to use the Live Server extension in Visual Studio Code. Right-click the index.html file and choose "Open with Live Server".Alternatively, you can use Python's built-in server. Open a new, separate terminal window, navigate to your project folder, and run:python -m http.server 8000
Then open your browser to http://localhost:8000.LicenseCopyright (c) 2025 [Your Name or GitHub Username]All Rights Reserved.The code in this repository is provided for viewing and educational purposes only. You are welcome to:View and fork the code for personal reference.Use the deployed web application for its intended purpose.Suggest changes or improvements by opening an Issue or a Pull Request.You are not permitted to:Modify, copy, or distribute the code for any purpose.Use this code, in whole or in part, in any other project, commercial or non-commercial.Create derivative works from this project.
