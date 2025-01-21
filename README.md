## Automated Video Clustering and Annotation Software (AVCAS)
AVCAS is an internal tool developed to streamline video understanding and annotation at NIST. It efficiently clusters thousands of unlabeled videos, assigns descriptive names to individual clusters and corresponding videos, and enables fast and easy annotation.
***
## Features
* Flexible application for video annotation and question answering.
* Accepts thousands of unlabeled, random video files or URLs.
* Utilizes machine learning for optimized video clustering.
* Assigns descriptive names to clusters and video files using local AI models.
* Sorts clusters by Intra-cluster similarity score, prioritizing the most informative ones for annotators and reducing the time required for relevant video file selection.
* Offers an intuitive UI for monitoring annotation progress.
***
## How to Use
### Starting AVCAS - first steps
AVCAS is a Django application and requires the following steps:
1. Run git clone https://github.com/prysykes/nist_app.git
    to clone this repository.
2. Run pip install requirements.txt
    to install the requirements file.
3. Run python manage.py makemigration and Python manage.py migrate 
    to migrate data models to the database (The DB must be set up before this command).
4. Run python manage.py createsuperuser and follow the prompts
    to create an admin user for user and group management.
5. Run python manage.py runserver
    to start the application.
6. The development server is mapped to localhost and port 8000 by default i.e. http://127.0.0.1:8000/
7. Visit http://127.0.0.1:8000/admin, login using the superuser credential
8. Create a user group called 'job_admin'
9. All annotation or Video_qa cycle MUST have an admin
10. Each admin must be assigned to the job_admin group

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
2. Ask the Superuser to activate this account and assign the annotator to the 'job_admin' group.
3. Login to the application (http://127.0.0.1:8000/) using the annotator admin credentials
4. Click upload videos
5. Choose 'Video Annotation' in the 'select project type'
6. Enter project name e.g. 'Trecvid 2025'
7. Upload full_cluster_csv.csv (the output from the ML pipepline)
8. Enter the number of annotators e.g. 3 (number of annotators are the number of people to assign the current job).
9. Upload the video files
10. Once video is uploaded, the application creates a project and unique groups based on the project name and number of annotators thus:
    a. Project = Trevec2025
    b. Unique annotator groups = "Trevec2025_grp_1", "Trevec2025_grp_2", "Trevec2025_grp_3".
##### Annotator Video Assignment 
1. Ask annotators to create annotator accounts corresponding to the number of annotators required for the current job cycle.
2. The superuser must activate each annotator account and assign each annotator to a unique annotator group (one of the above) thus: 
    a. Login to the admin site, click on 'users',
    b. Select the specific user 
    c. Check the Active checkbox and save
3. An annotator's assigned group determines the videos displayed on their dashboard, ensuring that each annotator only works with the videos associated with their specific group.

#### Video Question and Answering
To use AVCAS for ***video question and answering***, kindly follow  these steps
1. Create a video question and answering admin account using the user registration form
2. Ask the Superuser to activate this account and assign the admin account to the 'job_admin' group.
3. Login to the application (http://127.0.0.1:8000/) using this video QA admin credentials
4. Click upload videos
5. Choose 'Video Question Answering' in the 'select project type'
6. Enter project name e.g. 'TrecvidQA 2025'
7. Depending on the workflow desired, you may skip step 8
8. Upload full_cluster_csv.csv (the output from the ML pipepline)
8. Enter the number of annotators (number of annotators are the number of people you intend to assign to assign the current job).
9. Upload the video files
10. Once video is uploaded, the application creates a project and unique groups based on the project name and number of annotators thus:
    a. Project = TrecvidQA2025
    b. Unique annotator groups = "TrecvidQA2025_grp_1", "TrecvidQA2025_grp_2", "TrecvidQA2025_grp_3".

See Annotator video assignment step above to learn how to asign videos to the users.
***
