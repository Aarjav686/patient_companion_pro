FROM python:3.11-slim
WORKDIR /app

# Install Python dependencies
COPY ai_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy AI service code and datasets
COPY ai_service/ .
COPY datasets/ ./datasets/

# Train model during build (generates model.pkl + symptoms_list.pkl)
RUN python train.py

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
