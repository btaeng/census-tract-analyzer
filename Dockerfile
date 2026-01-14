# 1. Use a lightweight Python image
FROM python:3.11-slim

# 2. Prevent Python from writing .pyc files and enable logging
ENV FLASK_RUN_HOST=0.0.0.0
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Create the working directory inside the "box"
WORKDIR /app

# 4. Copy the requirements list and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy EVERYTHING from your root folder into the container
# This includes app.py, census_client.py, and the /static folder
COPY . .

# 6. Expose the port Flask runs on
EXPOSE 5000

# 7. Start the Flask app
# Make sure app.py is the name of your entry file!
CMD ["python", "app.py"]