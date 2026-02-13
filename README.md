## Automated Video Clustering and Annotation Software (AVCAS)
AVCAS is an internal tool developed to streamline video understanding and annotation at NIST. It efficiently clusters thousands of unlabeled videos, assigns descriptive names to individual clusters and corresponding videos, and enables fast and easy annotation.
***
## Features
* Flexible application for video annotation and question answering.
* Accepts thousands of unlabeled, random video files or youtube IDs.
* Utilizes machine learning for optimizued video clustering.
* Sorts clusters by Intra-cluster similarity score, prioritizing the most informative ones for annotators and reducing the time required for relevant video file selection.
* Offers an intuitive UI for monitoring annotation progress.
***
## How to Use
### Starting AVCAS - first steps
AVCAS is a Django application and requires the following steps:
A. Using Docker (recommended).
1. Ensure you have Docker installed on your computer and the Docker daemon is running, then follow these steps:
    a. Clone this repository: `git clone https://github.com/prysykes/nist_app.git`
    b. Configure the environment: `cp .env.example .env.prod` and update `.env.prod` with your actual values (database password, secret key, etc.)
    c. Create the resource directories that the application expects:
       ```
       mkdir -p nist_trecvid_resources/cluster_csv
       mkdir -p nist_trecvid_resources/videos
       mkdir -p nist_trecvid_resources/youtube_files_json
       mkdir -p nist_trecvid_resources/youtube_files_txt
       ```
    d. Build and start the containers: `docker compose up --build`
    e. The application can be accessed at http://localhost:8080 (served via nginx)
    f. Django Admin Site: http://localhost:8080/admin
    g. To create a superuser: `docker compose exec web python manage.py createsuperuser` and follow the prompt.
    h. Visit the admin site to log into your application.
2. Add your resource files to the appropriate directories:
    a. Your cluster CSV files to `nist_trecvid_resources/cluster_csv` (if any);
    b. Your video files to `nist_trecvid_resources/videos` (if any);
    c. Your youtube JSON files to `nist_trecvid_resources/youtube_files_json` (if any);
    d. Your youtube TXT files to `nist_trecvid_resources/youtube_files_txt` (if any);

B. Local Development (without Docker)
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


### Machine Learning (ML) Pipeline
We have provided a jupyter notebook that accepts thousands of unlabeled video and clusters them.
1. The program accepts a path to unlabeled videos and outputs a CSV file.
2. The CSV file contains video defualt filenames, cluster membership IDs, video keywords descriptions, cluster keywords description, intracluster performance scores.
3. The CSV file is saved as full_cluster_csv.csv.
### AVCAS Usecases
AVCAS Supports two kinds of video analytics pipelines
1. **Video Annotation (annotation)**
2. **Video Question and Answering (Video_qa)**
#### Video Annotation 
To use AVCAS for ***video annotation***, kindly follow  these steps
1. Create an annotator coordinator account using the user registration form
2. Choose Video Annotation (default) as the Project type
3. The "is job admin" check box should only be selected when creating a coordinator account.
4. Login to the application (http://localhost:8080/) using the coordinator credentials
5. Click upload videos
6. Choose 'Video Annotation' in the 'select project type'
7. Enter project name e.g. 'Trecvid 2025'. This must match the project name chosen during the coordinator account creation.
8. Enter the cluster_csv path i.e. nist_trecvid_resources/cluster_csv (the output from the ML pipeline), if any.
9. Enter the number of annotators e.g. 3 (number of annotators are the number of people to assign the current job).
10. Enter the video directory path i.e: nist_trecvid_resources/videos or any local path.
11. Ignore "Select youtube source type" since you are working with local video files.
12. Click "create job".
13. The application uploads the videos, creates a project and unique groups based on the project name and number of annotators thus:
    a. Project = Trevec2025
    b. Unique annotator groups = "Trevec2025_grp_1", "Trevec2025_grp_2", "Trevec2025_grp_3".
##### Annotator Video Assignment 
1. Ask annotators to create annotator accounts corresponding to the number of annotators required for the current job cycle.
2. Annotators must not check the "is job admin" box.
3. The Project name and Project type must match those selected by the job admin.
2. Once the account is created, the application assigned a group to the annotator as well as corresponding unique video.
3. An annotator's assigned group determines the videos displayed on their dashboard, ensuring that each annotator only works with the videos associated with their specific group.

#### Video Question and Answering
To use AVCAS for ***video question and answering***, kindly follow  these steps
1. Create a video question and answering admin account using the user registration form
2. Choose Video Question Answering as the Project type.
3. The "is job admin" check box should only be selected for the coordinator account.
4. Login to the application (http://localhost:8080/) using the coordinator credentials
5. Click upload videos
6. Choose 'Video Question Answering' in the 'Select project type'
7. Enter project name e.g. 'TrecvidVQA2025'. This must match the project name chosen during admin account creation.
8. Enter the cluster_csv path i.e. nist_trecvid_resources/cluster_csv (the output from the ML pipepline), if any.
9. Enter the number of annotators e.g. 3 (number of annotators are the number of people to assign the current job).
10. Enter the video directory path i.e: nist_trecvid_resources/videos
11. Ignore "Select youtube source type" since you are working with local video files.
12. Click "create job".
13. The application uploads the videos, creates a project and unique groups based on the project name and number of annotators thus:
    a. Project = TrecvidVQA2025
    b. Unique annotator groups = "TrecvidVQA2025_grp_1", "TrecvidVQA2025_grp_2", "TrecvidVQA2025_grp_3".

#### The Video Question Answering pipeline also work with files containing youtube IDs thus:
To use AVCAS for ***videos from youtube for video question and answering***, kindly follow  these steps
1. Create a video question and answering admin account using the user registration form
2. Choose Video Question Answering as the Project type.
3. The "is job admin" check box should only be selected when creating an admin account.
4. Login to the application (http://localhost:8080/) using this video QA admin credentials
5. Choose 'Video Question Answering' in the 'Select project type'
6. Enter project name e.g. 'TrecvidVQA2025'. This must match the project name chosen during admin account creation.
7. Enter the number of annotators e.g. 3 (number of annotators are the number of people to assign the current job).
8. Click the "Select youtube source type :- Select either "JSON Files" or "TXT Files", depending on how you data is stored.
9. Click "create job".
10. The application uploads the videos, creates a project and unique groups based on the project name and number of annotators thus:
    a. Project = TrecvidVQA2025
    b. Unique annotator groups = "TrecvidVQA2025_grp_1", "TrecvidVQA2025_grp_2", "TrecvidVQA2025_grp_3".
