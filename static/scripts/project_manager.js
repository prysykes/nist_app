var project_type = document.querySelector('#project_type')
var question_tag = document.querySelector('#question_tag')

var project_selected = 0;
var appr_rej_btn_appended = false
{/* <div id="apr_rej_btn_div" class="apr_rej_btn_div">
    <input type="button" value="approve" class="nist-button btn_apr_rej">
    <input type="button" value="reject" class="nist-button btn_apr_rej">
</div> */}


// if (project_type=='image_qa'){
//     var action_div = create_qa_btn_controls()
//     console.log("in qa");
    
// }
// else{
//     var action_div = create_apr_rej(file_name, assoc_category, project_type) 
// }

// vid_tag.appendChild(action_div)




function create_qa_btn_controls(){
    let skip = document.createElement('input')
    skip.value = 'skip'
    skip.classList =  "nist-button btn_qa"
    skip.type = 'button'
    let submit = document.createElement('input')
    submit.value = 'submit'
    submit.classList =  "nist-button btn_qa"
    submit.type = 'submit'

    return [skip, submit]
    
}

project_type.addEventListener('change', (e)=>{
    let apr_rej_btn_div = document.querySelector('#apr_rej_btn_div')
    let show_annotation_job = document.querySelector('#show-annotation-job')
    let show_imageqa_job = document.querySelector('#show-imageqa-job')
    let selected_project_type = e.target.value
    // let selected_option = e.target.options[e.target.selectedIndex] // retrieve the clicked option
    if (selected_project_type == 'annotation'){
        question_tag.classList.toggle('display-none')
        let btn_apr_rej = document.querySelectorAll('.btn_apr_rej')
        let btn_qa = document.querySelectorAll('.btn_qa')
        btn_apr_rej.forEach((btn_elem)=>{
            btn_elem.classList.toggle('display-none')
        })
        
        btn_qa.forEach((btn_elem)=>{
            btn_elem.classList.toggle('display-none')
        })
        
        // if (project_selected == 0){
        //     // no project is showing
        //     show_annotation_job.classList.remove('display-none')
        //     project_selected = 1
        // }
        // else if (project_selected==1){
        //     // user wants to hide  anotationproject
        //     show_annotation_job.classList.add('display-none')
        //     project_selected = 0
            
        // }
        // else if (project_selected==2){
        //     //image_qa showing hide it and show annotation project
        //     show_imageqa_job.classList.add('display-none')
        //     show_annotation_job.classList.remove('display-none')
        //     project_selected = 1
        // }
        
    }
    else if (selected_project_type == 'image_qa'){
        let apr_rej_btn_div = document.querySelector('#apr_rej_btn_div')
        const[skip, submit] = create_qa_btn_controls()
        console.log("skip", skip)
        console.log("submit", submit);
        ;
        
        
        // <input type="button" value="approve" class="nist-button btn_apr_rej"></input>
        // <input type="button" value="reject" class="nist-button btn_apr_rej"></input>
        question_tag.classList.toggle('display-none')
        let btn_apr_rej = document.querySelectorAll('.btn_apr_rej')
        let btn_qa = document.querySelectorAll('.btn_qa')
        
        btn_apr_rej.forEach((btn_elem)=>{
            btn_elem.classList.toggle('display-none')
        })

        if (!appr_rej_btn_appended){
            apr_rej_btn_div.appendChild(submit)
            apr_rej_btn_div.appendChild(skip)
            appr_rej_btn_appended = true
        }else{
            btn_qa.forEach((btn_elem)=>{
                btn_elem.classList.toggle('display-none')
            })
        }
        
        // if (project_selected == 0){
        //     // no project is showing
        //     show_imageqa_job.classList.remove('display-none')
        //     project_selected = 2
        // }
        // else if (project_selected==2){
        //     // user wants to hide image_qa project
        //     show_imageqa_job.classList.add('display-none')
        //     project_selected = 0
            
        // }
        // else if (project_selected==1){
        //     //annotation showing hide it and show image_qa project
        //     show_annotation_job.classList.add('display-none')
        //     show_imageqa_job.classList.remove('display-none')
        //     project_selected = 2
        // }
        
    }
    
    
})
