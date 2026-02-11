import {base_url, get_next_video_appr_rej, add_active_to_span, prepare_quest_answer_resp, show_mark_unavailable, mark_good_bad} from './main.js'

let skip_btn_qa = document.querySelector('#skip_btn_qa')


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
    
        let vid_tag = document.getElementById('vid_tag')
        // let vid_tag_children = vid_tag.childNodes
        // console.log(('vid_tag_children', vid_tag_children));
        
        let cat_name_div = document.querySelector('#cat_name')
        let file_name_div = document.querySelector('#video_name_value')

        
        let file_name = file_name_div.textContent
        let assoc_category = cat_name_div.textContent.split('|').at(0).trim()
        let appr_rej = 'reject'
        let project_type = project_type_div.textContent
        

        let kwargs = {file_name:file_name, assoc_category:assoc_category, appr_rej:appr_rej, add_active_to_span:add_active_to_span, project_type:project_type}
        get_next_video_appr_rej(kwargs)
       
        
    })
    
    div.appendChild(skip)

    return div
    
}

function submit_video_qa_form({isEdit=null}){

    let form_csrf_token = document.querySelector('#form-csrf-token')
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

    let new_form_data = new FormData()
    if (!isEdit){
        var endpoint = base_url+"/submit_vid_qa"

        // Validate required fields before submission
        let questionField = vid_qa_form.querySelector('[name="question"]')
        let correctAnsField = vid_qa_form.querySelector('[name="correct_ans"]')

        if (questionField && !questionField.value.trim()) {
            showFormError('Please enter a question')
            return
        }
        if (correctAnsField && !correctAnsField.value.trim()) {
            showFormError('Please enter the correct answer')
            return
        }

        for (let i=0; i < vid_qa_form.elements.length; i++){
            let element = vid_qa_form.elements[i]
            new_form_data.append(element.name, element.value)
        }
    }else{
        let qa_ids = document.querySelectorAll('.qa_ids')
        let video_qa_vals = document.querySelectorAll('.video_qa_vals')
        for (let i=0; i < qa_ids.length; i++){
            let cur_id = qa_ids[i].id.split('-').at(-1)
            let cur_text_area = video_qa_vals[i]
            let cur_text_area_name = cur_text_area.name
            let element_name = cur_text_area_name + "-" + cur_id
            let element_value = cur_text_area.value

            new_form_data.append(element_name, element_value)
        }
        var endpoint = base_url+`/submit_vid_qa?is_edit=${isEdit}`
    }

    new_form_data.append('video_filename', video_filename)
    new_form_data.append('cluster_keyword', cluster_keyword)
    new_form_data.append(csrf_token_name, csrf_token)

    fetch(endpoint,{
        method: 'POST',
        body: new_form_data
    })
    .then((response) => {
        if (!response.ok) {
            return response.json().then(err => { throw err })
        }
        return response.json()
    })
    .then((data)=>{
        if (data.error) {
            showFormError(data.error)
            return
        }

        let parent_div = document.querySelector('#question_tag')

        parent_div.classList.add("qs_default")
        parent_div.innerHTML = ""
        let div = prepare_quest_answer_resp({quest_ans_data:data, isEdit:isEdit})

        parent_div.appendChild(div)

        // Mark the video as processed in the sidebar list
        if (!isEdit && data.question) {
            // Video was successfully processed with a question
            mark_good_bad(video_filename, 'approve')

            // Update the span's data so clicking it again will show Q&A instead of form
            let span_id = `li_${video_filename}`
            let video_span = document.getElementById(span_id)
            if (video_span) {
                // Store that this video is now processed
                video_span.dataset.checkedBy = 'current_user'
                video_span.dataset.status = 'true'
            }
        }
    })
    .catch(error => {
        console.error("Q&A submission error:", error)
        showFormError(error.error || 'An error occurred while submitting. Please try again.')
    })
}

// Helper function to show form errors to the user
function showFormError(message) {
    let errorDiv = document.querySelector('#qa-form-error')
    if (!errorDiv) {
        errorDiv = document.createElement('div')
        errorDiv.id = 'qa-form-error'
        errorDiv.style.cssText = 'color: #dc2626; background: #fef2f2; padding: 10px; border-radius: 6px; margin-bottom: 10px; text-align: center;'
        let questionTag = document.querySelector('#question_tag')
        if (questionTag) {
            questionTag.insertBefore(errorDiv, questionTag.firstChild)
        }
    }
    errorDiv.textContent = message
    errorDiv.style.display = 'block'

    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none'
    }, 5000)
}

function retrieve_next_video_qa({isEdit=false}){
    
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
      
    if (assoc_category.innerText == ""){
        assoc_category = document.querySelector('#cat_name').innerText.split('|').at(0).trim()
        
    }
    else{
        assoc_category = assoc_category.innerText.split(':').at(1).trim()
        IsAdminPage = true
    }


    
    let appr_rej = 'approve'
    
    

    let kwargs = {file_name:file_name, assoc_category:assoc_category, 
        appr_rej:appr_rej, add_active_to_span:add_active_to_span,
         project_type:project_type, IsAdminPage:IsAdminPage}
    
    get_next_video_appr_rej(kwargs)

}


function create_form_elements({elem_name=null, elem_id=null, elem_inner_text=null, submit=null, isQuestion=false}){
    let label_elem_div = document.createElement('div')
    label_elem_div.className = 'qa-form-field'

    // Style for grid layout
    label_elem_div.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
    `

    // Don't add label for submit button (button has its own text)
    if (!submit) {
        let form_label_div = document.createElement('div')
        form_label_div.className = 'qa-form-label'

        let label = document.createElement('label')
        label.htmlFor = `${elem_id}`
        label.innerText = `${elem_inner_text}`
        label.style.cssText = `
            font-weight: 600;
            font-size: 14px;
            color: #374151;
        `
        form_label_div.appendChild(label)

        label_elem_div.appendChild(form_label_div)
    }

    if (submit){
        let submit_elem_div = document.createElement('div')
        submit_elem_div.className = "qa-submit-btn"
        let submit_elem = document.createElement('button')
        submit_elem.name = `${elem_name}`
        submit_elem.type = 'submit'
        submit_elem.innerHTML = '<span class="material-icons">send</span> Submit Q&A'

        // Match button height to textarea height
        submit_elem.style.cssText = `
            min-height: 80px;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        `

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
        text_area_div.className = "qa-form-input"

        let text_area = document.createElement('textarea')
        text_area.spellcheck = "true"
        text_area.name = elem_name
        text_area.id = elem_id
        text_area.placeholder = isQuestion ? "Enter your question here..." : "Enter answer..."
        // Make textarea responsive and compact for grid layout
        text_area.style.cssText = `
            width: 100%;
            min-height: 80px;
            resize: vertical;
            box-sizing: border-box;
            padding: 8px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
        `
        text_area.rows = isQuestion ? "3" : "2"
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

    // Add CSS Grid layout for compact 2-row display
    video_QA_form.style.cssText = `
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
        align-items: start;
    `

    let question = create_form_elements({elem_name:'question', elem_id:'question', elem_inner_text:'Question', isQuestion: true})
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