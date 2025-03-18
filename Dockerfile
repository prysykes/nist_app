# # Stage1: builder state base image alias this stage as builder 
# FROM python:3.13-slim AS builder 

# #create the app directory
# RUN mkdir /app

# #Set the working direcory
# WORKDIR /app

# #Set ENV variables to optimize python
# ENV PYTHONDONTWRITEBYTECODE=1
# ENV PYTHONUNBUFFERED=1 

# #Install dependencies
# RUN pip install --upgrade pip
# COPY requirements.txt /app/
# RUN pip install --no-cache-dir -r requirements.txt

# #Stage 2: Production stage
# FROM python:3.13-slim

# RUN useradd -m -r appuser && \
#     mkdir /app && \
#     chown -R appuser /app

# #Copy the python dependencies from the builder stage
# COPY --from=builder /usr/local/lib/python3.13/site-packages/ /usr/local/lib/python3.13/site-packages/
# COPY --from=builder /usr/local/bin/ /usr/local/bin/

# #Set the working directory
# WORKDIR /app

# #copy application code
# COPY --chown=appuser:appuser . .

# #Set ENV variables to optimize python
# ENV PYTHONDONTWRITEBYTECODE=1
# ENV PYTHONUNBUFFERED=1 

# # switch to non root user for security
# USER appuser

# # Expose the application port
# EXPOSE 8000

# RUN chmod +x /app/start.sh

# # Start the application
# CMD [ "/app/start.sh" ]


# Use Python 3.12.2 image based on Debian in its slim variant as the base image
FROM python:3.12.3-slim

# access of app in docker is through this link: http://0.0.0.0:8000

# Set an environment variable to unbuffer Python output, aiding in logging and debugging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

#set work directory
WORKDIR /app

#install dependencies
COPY requirements.txt .

RUN pip install --upgrade pip --no-cache-dir && pip install -r requirements.txt

# Copy project files to work directory
COPY . .

COPY start.sh /app/start.sh

RUN chmod +x start.sh

EXPOSE 80

CMD ["sh", "./start.sh"]

