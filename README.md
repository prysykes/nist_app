## Automated Video Clustering and Annotation Software (AVCAS)
AVCAS is an internal tool developed to streamline video understanding and annotation at NIST. It efficiently clusters thousands of unlabeled videos, assigns descriptive names to individual clusters and corresponding videos, and enables fast and easy annotation.
***
## Features
* Flexible application for video annotation and question answering.
* Accepts thousands of unlabeled, random video files or YouTube IDs.
* Utilizes machine learning for optimized video clustering.
* Sorts clusters by intra-cluster similarity score, prioritizing the most informative ones for annotators and reducing the time required for relevant video file selection.
* Offers an intuitive UI for monitoring annotation progress.
***
## How to Use
### Starting AVCAS - first steps
AVCAS is a Django application and requires the following steps:

### A. Using Docker (recommended)
1. Ensure you have Docker installed on your computer and the Docker daemon is running, then follow these steps:
    a. Clone this repository: `git clone https://github.com/prysykes/nist_app.git`
    b. Configure the environment: `cp .env.example .env.prod` and update `.env.prod` with your actual values (database password, secret key, etc.)
    c. Create the resource directories inside the project folder:
       ```
       mkdir -p nist_trecvid_resources/cluster_csv
       mkdir -p nist_trecvid_resources/videos
       mkdir -p nist_trecvid_resources/youtube_files_json
       mkdir -p nist_trecvid_resources/youtube_files_txt
       ```
    d. Add your resource files to the corresponding subdirectories:
       - **Cluster CSV files** (output from ML pipeline) go in `nist_trecvid_resources/cluster_csv/`
       - **Video files** go in `nist_trecvid_resources/videos/`
       - **YouTube JSON files** go in `nist_trecvid_resources/youtube_files_json/`
       - **YouTube TXT files** go in `nist_trecvid_resources/youtube_files_txt/`

       This folder is mounted into the Docker container automatically. Files can be added before or after starting the containers.

    e. Build and start the containers: `docker compose up --build`
    f. The application can be accessed at:
       - **HTTP:** http://localhost:8080
       - **HTTPS:** https://localhost:8443 (requires SSL setup, see below)
    g. Django Admin Site: http://localhost:8080/admin
    h. Create a superuser (admin account):
       ```
       docker compose exec web python manage.py createsuperuser
       ```
       Follow the prompts to enter a username, email, and password. A superuser is a Django admin account with full access to the Django Admin panel, where you can manage all database records, users, groups, and application data directly.
    i. Visit the Django Admin site at http://localhost:8080/admin and log in with your superuser credentials.

#### Upload Form — File Path Reference
When using the **Upload Videos** form, you can enter short directory/file names instead of full system paths. The app automatically resolves paths relative to the `nist_trecvid_resources/` directory.

| Form Field | What to Enter | Resolves To |
|---|---|---|
| **CSV File Path** | `full_cluster_csv.csv` | `nist_trecvid_resources/cluster_csv/full_cluster_csv.csv` |
| **Video Directory** | `videos` | `nist_trecvid_resources/videos` |
| **JSON Directory** | `youtube_files_json` | `nist_trecvid_resources/youtube_files_json` |
| **Text Directory** | `youtube_files_txt` | `nist_trecvid_resources/youtube_files_txt` |

> **Note:** Full system paths (e.g., `/Users/you/nist_trecvid_resources/videos`) are also supported and will work in both local and Docker environments. For Docker, ensure the files are placed in the project's `nist_trecvid_resources/` directory first, as that is the directory mounted into the container.

#### Enabling HTTPS (SSL) for Docker
To enable HTTPS access on port 8443, generate a self-signed SSL certificate:
1. Create the certs directory:
   ```
   mkdir -p nginx/certs
   ```
2. Generate a self-signed certificate:
   ```
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout nginx/certs/nginx.key \
     -out nginx/certs/nginx.crt \
     -subj "/CN=localhost"
   ```
3. Add the HTTPS origins to `DJANGO_CSRF_TRUSTED_ORIGINS` in `.env.prod`:
   ```
   DJANGO_CSRF_TRUSTED_ORIGINS=http://127.0.0.1:8080,http://localhost:8080,https://127.0.0.1:8443,https://localhost:8443
   ```
4. Restart the containers:
   ```
   docker compose down && docker compose up -d
   ```
5. Access the application at https://localhost:8443. Your browser will show a certificate warning since it is self-signed — click through it to proceed.

> **Note:** The `nginx/certs/` directory is gitignored and certificates should not be committed to the repository. Each developer should generate their own.

#### Connecting to the Docker Database
You can connect to the PostgreSQL database from your host machine using any database client (pgAdmin, DBeaver, TablePlus, DataGrip, or `psql`).

Use the following connection details (from your `.env.prod` file):
- **Host:** `localhost`
- **Port:** `5434`
- **Database:** value of `POSTGRES_DB` (e.g., `nist_db`)
- **User:** value of `POSTGRES_USER` (e.g., `nist_user`)
- **Password:** value of `POSTGRES_PASSWORD`

Example using `psql`:
```
psql -h localhost -p 5434 -U nist_user -d nist_db
```

> **Note:** Port `5434` is the external port mapped in `docker-compose.yml`. The internal container port remains `5432`.

### B. Local Development (without Docker)
1. Clone: `git clone https://github.com/prysykes/nist_app.git`
2. Create a virtual environment: `python -m venv .venv && source .venv/bin/activate`
3. Install dependencies: `pip install -r requirements.txt`
4. Configure the environment: `cp .env.example .env.local` and update with your values.
5. Set up a PostgreSQL database using the credentials in your `.env.local` file.
6. Run migrations: `python manage.py makemigrations && python manage.py migrate`
7. Create a superuser (admin management): `python manage.py createsuperuser`
8. Start the server: `python manage.py runserver`
9. Access the application at http://localhost:8000/
10. Access the Django admin at http://localhost:8000/admin

***
### Machine Learning (ML) Pipeline
We have provided a Jupyter notebook that accepts thousands of unlabeled videos and clusters them.
1. The program accepts a path to unlabeled videos and outputs a CSV file.
2. The CSV file contains video default filenames, cluster membership IDs, video keywords descriptions, cluster keywords descriptions, and intra-cluster performance scores.
3. The CSV file is saved as `full_cluster_csv.csv`.

***
### AVCAS Use Cases
AVCAS supports two kinds of video analytics pipelines:
1. **Video Annotation**
2. **Video Question and Answering (Video QA)**

#### Video Annotation
To use AVCAS for ***video annotation***, follow these steps:
1. Create a coordinator account using the user registration form.
2. Choose **Video Annotation** (default) as the Project type.
3. The "is job admin" checkbox should only be selected when creating a coordinator account.
4. Log in to the application using the coordinator credentials.
5. Click **Upload Videos**.
6. Choose **Video Annotation** in the "Select project type" dropdown.
7. Enter a project name (e.g., `Trecvid2025`). This must match the project name chosen during the coordinator account creation.
8. Enter the cluster CSV path (e.g., `/Users/you/nist_trecvid_resources/cluster_csv`) — the output from the ML pipeline, if any.
9. Enter the number of annotators (e.g., `3`) — the number of people to assign the current job.
10. Enter the video directory path (e.g., `/Users/you/nist_trecvid_resources/videos`).
11. Ignore "Select youtube source type" since you are working with local video files.
12. Click **Create Job**.
13. The application uploads the videos, creates a project and unique groups based on the project name and number of annotators:
    - Project = `Trecvid2025`
    - Unique annotator groups = `Trecvid2025_grp_1`, `Trecvid2025_grp_2`, `Trecvid2025_grp_3`

##### Annotator Video Assignment
1. Ask annotators to create annotator accounts corresponding to the number of annotators required for the current job cycle.
2. Annotators must **not** check the "is job admin" box.
3. The Project name and Project type must match those selected by the job admin.
4. Once the account is created, the application assigns a group to the annotator as well as corresponding unique videos.
5. An annotator's assigned group determines the videos displayed on their dashboard, ensuring that each annotator only works with the videos associated with their specific group.

#### Video Question and Answering
To use AVCAS for ***video question and answering***, follow these steps:
1. Create a Video QA admin account using the user registration form.
2. Choose **Video Question Answering** as the Project type.
3. The "is job admin" checkbox should only be selected for the coordinator account.
4. Log in to the application using the coordinator credentials.
5. Click **Upload Videos**.
6. Choose **Video Question Answering** in the "Select project type" dropdown.
7. Enter a project name (e.g., `TrecvidVQA2025`). This must match the project name chosen during admin account creation.
8. Enter the cluster CSV path (e.g., `/Users/you/nist_trecvid_resources/cluster_csv`) — the output from the ML pipeline, if any.
9. Enter the number of annotators (e.g., `3`) — the number of people to assign the current job.
10. Enter the video directory path (e.g., `/Users/you/nist_trecvid_resources/videos`).
11. Ignore "Select youtube source type" since you are working with local video files.
12. Click **Create Job**.
13. The application uploads the videos, creates a project and unique groups based on the project name and number of annotators:
    - Project = `TrecvidVQA2025`
    - Unique annotator groups = `TrecvidVQA2025_grp_1`, `TrecvidVQA2025_grp_2`, `TrecvidVQA2025_grp_3`

#### Video QA with YouTube IDs
To use AVCAS for ***videos from YouTube for video question and answering***, follow these steps:
1. Create a Video QA admin account using the user registration form.
2. Choose **Video Question Answering** as the Project type.
3. The "is job admin" checkbox should only be selected when creating an admin account.
4. Log in to the application using the Video QA admin credentials.
5. Choose **Video Question Answering** in the "Select project type" dropdown.
6. Enter a project name (e.g., `TrecvidVQA2025`). This must match the project name chosen during admin account creation.
7. Enter the number of annotators (e.g., `3`) — the number of people to assign the current job.
8. Click "Select youtube source type" and choose either **JSON Files** or **TXT Files**, depending on how your data is stored.
9. Click **Create Job**.
10. The application uploads the videos, creates a project and unique groups based on the project name and number of annotators:
    - Project = `TrecvidVQA2025`
    - Unique annotator groups = `TrecvidVQA2025_grp_1`, `TrecvidVQA2025_grp_2`, `TrecvidVQA2025_grp_3`
