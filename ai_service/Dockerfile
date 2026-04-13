FROM python:3.11-slim
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy AI service code
COPY . .

# Copy datasets from parent directory (needed for model training)
# When deploying on Render, set Root Directory to project root, NOT ai_service
# Alternatively, datasets can be included in the ai_service directory
COPY ../datasets ./datasets 2>/dev/null || true

# Train model if pkl doesn't exist
RUN python train.py || echo "⚠ Model training skipped — ensure model.pkl is available"

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
