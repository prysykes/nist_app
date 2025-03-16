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
1. Ensure you have docker installed in computer, start the docker deamon and follow these steps:
    a. Clone this repository on the machine: Run git clone https://github.com/prysykes/nist_app.git
    b.  Build the image: Run: docker build --no-cache -t avcas-image .
    c. Start the container: Run: docker compose up.
    d. The application can be accessed at http://localhost:8000 
    e. Admin Site: can be access at: http://localhost:8000/admin
    f. To create a superuser i.e an admin user: RUN: docker-compose exec web python manage.py createsuperuser and follow the prompt.
    g. Visit the admin site to login into your application
2. Once the application is running in docker, you will notice the following folders in the root directory
    - nist_trecvid_resources
        - cluster_csv #holds the output from the ML pipeline
        - videos
        - youtube_files_json
        - youtube_files_txt
3. Add:
    a. Your cluster_csv files to the nist_trecvid_resources/cluster_csv (if any);
    b. Your video files to the nist_trecvid_resources/videos (if any);
    c. Your youtube_files_json files to the nist_trecvid_resources/youtube_files_json (if any);
    d. Your youtube_files_txtfiles to the nist_trecvid_resources/youtube_files_txt (if any);

B. Raw Flow 
1. Run git clone https://github.com/prysykes/nist_app.git
    to clone this repository.
2. Run pip install requirements.txt
    to install the requirements file.
3. Set up postgreSQL database using the credentials available in local env file.
3. Run python manage.py makemigrations and Python manage.py migrate 
    to migrate data models to the database (The DB must be set up before this command).
4. Run python manage.py createsuperuser and follow the prompts
    to create an admin user for user and group management.
5. Run python manage.py runserver
    to start the application.
6. The development server is mapped to localhost and port 8000 by default i.e. http://localhost:8000/
7. Visit http://localhost:8000/admin, login using the superuser credential to explore the admin.


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
1. Create an annotator admin account using the user registration form
2. Choose Video Annotation (default) as the Project type
3. The "is job admin" check box should only be selected when creating an admin account.
4. Login to the application (http://localhost:8000/) using the annotator admin credentials
5. Click upload videos
6. Choose 'Video Annotation' in the 'select project type'
7. Enter project name e.g. 'Trecvid 2025'. This must match the project name chosen during admin account creation.
8. Enter the cluster_csv path i.e. nist_trecvid_resources/cluster_csv (the output from the ML pipepline), if any.
9. Enter the number of annotators e.g. 3 (number of annotators are the number of people to assign the current job).
10. Enter the video directory path i.e: nist_trecvid_resources/videos
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
3. The "is job admin" check box should only be selected when creating an admin account.
4. Login to the application (http://127.0.0.1:8000/) using this video QA admin credentials
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
4. Login to the application (http://127.0.0.1:8000/) using this video QA admin credentials
5. Choose 'Video Question Answering' in the 'Select project type'
6. Enter project name e.g. 'TrecvidVQA2025'. This must match the project name chosen during admin account creation.
7. Enter the number of annotators e.g. 3 (number of annotators are the number of people to assign the current job).
8. Click the "Select youtube source type :- Select either "JSON Files" or "TXT Files", depending on how you data is stored.
9. Click "create job".
10. The application uploads the videos, creates a project and unique groups based on the project name and number of annotators thus:
    a. Project = TrecvidVQA2025
    b. Unique annotator groups = "TrecvidVQA2025_grp_1", "TrecvidVQA2025_grp_2", "TrecvidVQA2025_grp_3".
