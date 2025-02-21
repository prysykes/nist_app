import {base_url, get_next_video_appr_rej, add_active_to_span, prepare_quest_answer_resp, show_mark_unavailable} from './main.js'

let skip_btn_qa = document.querySelector('#skip_btn_qa')
console.log("hello", skip_btn_qa );




function create_qa_btn_controls(){
    let div = document.createElement('div')
    div.id = 'submit_qs_btn_div'
    div.classList.add('submit_qs_btn_div')

    let skip = document.createElement('input')
    skip.value = 'skip video'
    skip.classList =  "nist-button skip_btn_qa"
    skip.type = 'button'

    skip.addEventListener('click', ()=>{
        let project_type_div = document.querySelector('#project_type_user_pg')
        let cat_name_div = document.querySelector('#cat_name')
        let file_name_div = document.querySelector('#video_name_value')

        
        let file_name = file_name_div.textContent
        let assoc_category = cat_name_div.textContent.split('|').at(0).trim()
        let appr_rej = 'reject'
        let project_type = project_type_div.textContent

        let kwargs = {file_name:file_name, assoc_category:assoc_category, appr_rej:appr_rej, add_active_to_span:add_active_to_span, project_type:project_type}
        get_next_video_appr_rej(kwargs)
        console.log("kwargs skip",kwargs);
        
    })
    
    div.appendChild(skip)

    return div
    
}

function submit_video_qa_form({isEdit=null}){
    let form_csrf_token = document.querySelector('#form-csrf-token')
    // console.log("submit form clicked", form_csrf_token);
    let csrf_token_element = form_csrf_token.elements[0]
    let csrf_token_name = csrf_token_element.name
    let csrf_token = csrf_token_element.value

    let project_type = document.querySelector('#project_type')
    if (project_type){
        var video_filename = document.querySelector('#video_name_value').innerText.trim()
        var cluster_keyword = document.querySelector('#cluster_keyword').innerText.split(':').at(1).trim()
        
    }else{
        var video_filename = document.querySelector('#video_name_value').innerText
        var cluster_keyword = document.querySelector('#cat_name').innerText.split('|').at(0).trim()
    }
    
    let vid_qa_form = document.querySelector('#video_qs_form')
    // console.log("vid_qa_form", vid_qa_form);
     
    let new_form_data = new FormData()
    if (!isEdit){
        var endpoint = base_url+"/submit_vid_qa"
        for (let i=0; i < vid_qa_form.elements.length; i++){
            let element = vid_qa_form.elements[i]
            new_form_data.append(element.name, element.value)
    
            
        }
    }else{
        console.log("is edit");
        let qa_ids = document.querySelectorAll('.qa_ids')
        let video_qa_vals = document.querySelectorAll('.video_qa_vals')    
        for (let i=0; i < qa_ids.length; i++){
            let cur_id = qa_ids[i].id.split('-').at(-1)
            let cur_text_area = video_qa_vals[i]
            let cur_text_area_name = cur_text_area.name
            let element_name = cur_text_area_name + "-" + cur_id
            let element_value = cur_text_area.value
            
            // let element = vid_qa_form.elements[i]
            new_form_data.append(element_name, element_value)
    
            
        } 
        var endpoint = base_url+`/submit_vid_qa?is_edit=${isEdit}`
    }
    
    

    new_form_data.append('video_filename', video_filename)
    new_form_data.append('cluster_keyword', cluster_keyword)
    new_form_data.append(csrf_token_name, csrf_token)

    // let endpoint = base_url+"/submit_vid_qa"
    console.log("endpoint>>", endpoint);
    
    let response = fetch(endpoint,{
        method: 'POST',
        body: new_form_data
    })
    .then((response)=> response.json())
    .then((data)=>{
        let parent_div = document.querySelector('#question_tag')
        parent_div.classList.add("qs_default")
        parent_div.innerHTML = ""
        let div = prepare_quest_answer_resp({quest_ans_data:data, isEdit:isEdit})
        
        parent_div.appendChild(div)
        let edit_btn = document.querySelector('#edit_res input')
        edit_btn.value = "edit response"
        
        // remove the class list
        parent_div.classList.add('qs_default')
                
        // console.log("data", data);
        // Object.entries(data).forEach(([key, value])=>{
        //     if (key.includes("question")){
        //         let assoc_id = value[0]
        //         let inner_text = value[1]
        //         console.log("met question", assoc_id, inner_text);

        //     }else{
        //         if (key.includes("correct")){
        //             let assoc_id = value[0]
        //             let inner_text = value[1]
        //             console.log("met correct", assoc_id, inner_text);
                    
        //         }else{
        //             let assoc_id = value[0]
        //             let inner_text = value[1]
        //             console.log("not qs not correct", assoc_id, inner_text);
                    
        //         }
        //     }
            
        // })
        
    })
    .catch(error => {
        console.log("error22", error);
        
    })

}

function retrieve_next_video_qa({isEdit=isEdit}){
    console.log("is edit>>", isEdit);
    
    let project_type_div = document.querySelector('#project_type_user_pg')
    let cat_name_div = document.querySelector('#cat_name')
    // if (cat_name_div){
    //     console.log("inside user QA");
        
    // }else {
    //     console.log("inside adminQA");
        
    // }

    let file_name_div = document.querySelector('#video_name_value')
 
    let file_name = file_name_div.textContent
    let project_type = project_type_div.textContent
    let assoc_category = document.querySelector('#cluster_keyword')
    let IsAdminPage = false
    if (assoc_category){
        assoc_category = assoc_category.innerText.split(':').at(1).trim()
        IsAdminPage = true
    }
    else{
        assoc_category = document.querySelector('#cat_name').innerText.split('|').at(0).trim() 
    }


    
    let appr_rej = 'approve'
    
    

    let kwargs = {file_name:file_name, assoc_category:assoc_category, 
        appr_rej:appr_rej, add_active_to_span:add_active_to_span,
         project_type:project_type, IsAdminPage:IsAdminPage}
    get_next_video_appr_rej(kwargs)

}


function create_form_elements({elem_name=null, elem_id=null, elem_inner_text=null, submit=null}){
    let label_elem_div = document.createElement('div')
    label_elem_div.className = 'row-align'

    let form_label_div = document.createElement('div')
    form_label_div.className = 'form-label'

    let label = document.createElement('label')
    label.for = `${elem_name}`
    label.innerText = `${elem_inner_text}:`
    form_label_div.appendChild(label)

    label_elem_div.appendChild(form_label_div)

    if (submit){
        let submit_elem_div = document.createElement('div')
        submit_elem_div.className = "nist-button"
        let submit_elem = document.createElement('input')
        submit_elem.name = `${elem_name}`
        submit_elem.style = 'text-align: center;'
        submit_elem.type = 'submit'
        submit_elem.value = "Submit"
        submit_elem.addEventListener('click', (e)=>{
            e.preventDefault()
            let isEdit = false
            submit_video_qa_form({isEdit:isEdit})

            
            // retrieve next video 
            retrieve_next_video_qa({isEdit:isEdit})
           
        })
        
        submit_elem_div.appendChild(submit_elem)
        label_elem_div.appendChild(submit_elem_div)
      
        
    }
    else {
        let text_area_div = document.createElement('div')
        text_area_div.className = "form-text-input"

        let text_area = document.createElement('textarea')
        text_area.spellcheck = "true"
        text_area.name = elem_name
        text_area.id = elem_id
        text_area.cols = "50"
        text_area.rows = "10"
        text_area_div.appendChild(text_area)
        
        label_elem_div.appendChild(text_area_div)
    }

    

    

    return label_elem_div
}

function create_video_QA_form(){
    // let form_parent_div = document.createElement('div')
    // form_parent_div.id = "question_tag"
    let video_qa_h3 = document.querySelector('#video-qa-h3')
    video_qa_h3.textContent = ""
        
    

    let video_QA_form = document.createElement('form')
    video_QA_form.method = "post"
    video_QA_form.id = 'video_qs_form'
    
    let question = create_form_elements({elem_name:'question', elem_id:'question', elem_inner_text:'Question'})
    video_QA_form.appendChild(question)
    
    let correct_ans = create_form_elements({elem_name:'correct_ans', elem_id:'correct_ans', elem_inner_text:'Correct Answer'})
    video_QA_form.appendChild(correct_ans)
    
    let opt_ans_one = create_form_elements({elem_name:'opt_ans_one', elem_id:'opt_ans_one', elem_inner_text:'Answer Option'})
    video_QA_form.appendChild(opt_ans_one)
    
    let opt_ans_two = create_form_elements({elem_name:'opt_ans_two', elem_id:'opt_ans_two', elem_inner_text:'Answer Option'})
    video_QA_form.appendChild(opt_ans_two)
    
    let opt_ans_three = create_form_elements({elem_name:'opt_ans_three', elem_id:'opt_ans_three', elem_inner_text:'Answer Option'})
    video_QA_form.appendChild(opt_ans_three)
    
    // let opt_ans_four = create_form_elements({elem_name:'opt_ans_four', elem_id:'opt_ans_four', elem_inner_text:'Answer Option'})
    // video_QA_form.appendChild(opt_ans_four)
    
    let submit = create_form_elements({elem_name:'submit-vid-qa', elem_id:'submit-vid-qa', elem_inner_text:'Send QandA', submit:true})
    video_QA_form.appendChild(submit)


    video_qa_h3.textContent = "Enter Question and Answers"
    return video_QA_form
    // form_parent_div.appendChild(video_QA_form)

}



export {create_qa_btn_controls, create_video_QA_form, create_form_elements, submit_video_qa_form, retrieve_next_video_qa}