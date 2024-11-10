var project_type = document.querySelector('#project_type')

var project_selected = 0;

project_type.addEventListener('change', (e)=>{
    let show_annotation_job = document.querySelector('#show-annotation-job')
    let show_imageqa_job = document.querySelector('#show-imageqa-job')
    let selected_project_type = e.target.value
    // let selected_option = e.target.options[e.target.selectedIndex] // retrieve the clicked option
    if (selected_project_type == 'annotation'){
        
        if (project_selected == 0){
            // no project is showing
            show_annotation_job.classList.remove('display-none')
            project_selected = 1
        }
        else if (project_selected==1){
            // user wants to hide  anotationproject
            show_annotation_job.classList.add('display-none')
            project_selected = 0
            
        }
        else if (project_selected==2){
            //image_qa showing hide it and show annotation project
            show_imageqa_job.classList.add('display-none')
            show_annotation_job.classList.remove('display-none')
            project_selected = 1
        }
        
    }
    else if (selected_project_type == 'image_qa'){
        if (project_selected == 0){
            // no project is showing
            show_imageqa_job.classList.remove('display-none')
            project_selected = 2
        }
        else if (project_selected==2){
            // user wants to hide image_qa project
            show_imageqa_job.classList.add('display-none')
            project_selected = 0
            
        }
        else if (project_selected==1){
            //annotation showing hide it and show image_qa project
            show_annotation_job.classList.add('display-none')
            show_imageqa_job.classList.remove('display-none')
            project_selected = 2
        }
        
    }
    
    
})
