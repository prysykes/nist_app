import os

trial_vid = 'trial_vids'

print(os.path.isdir(trial_vid))

print(os.getcwd())
wkdir = os.getcwd()

for idx, file in enumerate(sorted(os.listdir(trial_vid))):

    if idx <= 100:
        class_name = 'className'
        cluster_id = 'music'
        full_path = os.path.join(wkdir, f'{trial_vid}')
        new_file_name = f'{class_name}{idx}_{cluster_id}.webm'
        os.rename(f'{full_path}/{file}', f'{full_path}/{new_file_name}')
        

    elif 100 < idx <= 200:
        class_name = 'className'
        cluster_id = 'sports'
        full_path = os.path.join(wkdir, f'{trial_vid}')
        new_file_name = f'{class_name}{idx}_{cluster_id}.webm'
        os.rename(f'{full_path}/{file}', f'{full_path}/{new_file_name}')
    
    elif 200 < idx <= 300:
        class_name = 'className'
        cluster_id = 'singing'
        full_path = os.path.join(wkdir, f'{trial_vid}')
        new_file_name = f'{class_name}{idx}_{cluster_id}.webm'
        os.rename(f'{full_path}/{file}', f'{full_path}/{new_file_name}')
    
    elif 300 < idx <= 400:
        class_name = 'className'
        cluster_id = 'reading'
        full_path = os.path.join(wkdir, f'{trial_vid}')
        new_file_name = f'{class_name}{idx}_{cluster_id}.webm'
        os.rename(f'{full_path}/{file}', f'{full_path}/{new_file_name}')

    elif 400 < idx <= 500:
        class_name = 'className'
        cluster_id = 'swiming'
        full_path = os.path.join(wkdir, f'{trial_vid}')
        new_file_name = f'{class_name}{idx}_{cluster_id}.webm'
        os.rename(f'{full_path}/{file}', f'{full_path}/{new_file_name}')

