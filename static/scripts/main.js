let login = document.querySelector('#tm-login')
let tm_login_form = document.querySelector('#tm_login_form')
let btn_vid_upload = document.querySelector('#upload_videos')
let div_vid_upld = document.querySelector('#video_upload')
let cat_headings = document.querySelectorAll('.cat_headings')
let cat_name = document.querySelector('#cat_name')
let video_list_disp = document.querySelector('#video_list_disp')
let vid_preview = document.getElementById('vid_preview')
let end_annotation = document.querySelector('#end-annotation')
let approve_btn = document.querySelector('#approve_btn')
let video_name = document.querySelector('#video_name')


// let progress = document.querySelectorAll('.cat_headings .progress')



// console.log(video_name);

var app_rej_btn_div = null

var VIDEO_TYPE = "video/webm"
var ANNOTATION_ENDED = false



//http://127.0.0.1:8000/display_videos?term=sports
const base_url = window.location.origin
const full_url_path = base_url+'/display_videos?term='
const get_videos_per_category = base_url+'/get_videos_per_category?term='
const process_user_decision = base_url+'/process_user_decision?selection='
const base_vid_src = "media/"

// let full_url_path = base_url+'/display_videos?term='
let process_user_sel_url = base_url+'/process_user_selection?selection='




if (login != null) {
    login.addEventListener('click', ()=>{
        tm_login_form.classList.toggle('display-none');
    })
}
    

if (end_annotation == null){
    // checks if the displayed page is for annotator
    let btn_vid_upload = document.querySelector('#upload_videos')
    btn_vid_upload.addEventListener('click', ()=>{
        div_vid_upld.classList.toggle('display-none')
    })
}

// Beging function to allow a user end annotation

function handle_confirm_yes_or_no({caller1=null, caller2=null, value=null, target_elem=null}){
    if (caller1 == 'end_annotaion'){
        if (value){
            // mark job_finished in user model to false
            // change the annotation ended text to end-annotation 
            let user = document.getElementById('last_name').innerText.split(' ')[1]
            let end_annotation_endpoint = `${base_url}/end_annotation?user=${user}&restart_end=true`
                let response = fetch(end_annotation_endpoint, {
                    method: 'GET'
                })
                .then(response => response.json()) 
                .then((data)=>{
                    console.log(data['restarted']);
                    if (data['restarted']){
                        ANNOTATION_ENDED = false
                        target_elem.textContent = 'End Annotation'
                    }
                    
                    
                })
    
        }else{
            // handle end
        }
    }else{
        if (value){

        }
    }
    
  
    
}

// customConfirm({message:message, target_elem:end_annotation, callback:handle_confirm_yes_or_no, appr_rej:appr_rej, file_name:file_name, assoc_category:assoc_category, callback2:add_active_to_span}
function customConfirm({message=null, target_elem=null, callback=null, appr_rej=null, file_name=null, assoc_category=null, callback2=null}) {
    const confirm_overlay = document.getElementById('custom-confirm')
    confirm_overlay.style.display = 'flex' // removes the display none

    const restartButton = document.getElementById('confirm-restart');
    const cancelButton = document.getElementById('confirm-cancel');

    confirm_overlay.querySelector('p').textContent = message;

    // Handle OK button click
    restartButton.addEventListener('click', ()=>{
        confirm_overlay.style.display = 'none';  // Hide dialog
        let caller1 = 'end_annotaion'
        
        callback({caller1:caller1, value:true, target_elem:target_elem});  // Pass true to callback (OK pressed)
        // handle when restart is called by appr or rej button
        if (appr_rej){
            // add logic to mark the video as approved or denied
            get_next_video_appr_rej(file_name, assoc_category, appr_rej, callback2)
            callback({caller1:caller1, caller2:appr_rej, value:true, target_elem:target_elem}); 
            
            
        }
    });

    // Handle Cancel button click
    cancelButton.addEventListener('click', ()=> {
        confirm_overlay.style.display = 'none';  // Hide dialog
        let caller = 'end_annotaion'
        callback(caller, false, target_elem);  // Pass false to callback (Cancel pressed)
    });

}

if (btn_vid_upload == null){
    // checks if the displayed page is for admin
    // btn_vid_upload  is only in the admin page
    let end_annotation = document.querySelector('#end-annotation')
    end_annotation.addEventListener('click', (e)=> {
        let target_elem = e.target
        
    
        if (target_elem.innerText.trim().includes('Restart Annotation')){
            let message =  "You already finished annotation. Do you want to restart?" 
            // {is_admin:is_admin_, prev_file_name:prev_file_name,  assoc_category:assoc_category, data:data, appr_rej:appr_rej, caller:'appr_rej'}
            
            customConfirm({message:message, target_elem:target_elem, callback:handle_confirm_yes_or_no}) ;
            
            
        }else{
            let user = document.getElementById('last_name').innerText.split(' ')[1]
            let end_annotation_endpoint = `${base_url}/end_annotation?user=${user}&restart_end=false`
            let response = fetch(end_annotation_endpoint, {
                method: 'GET'
            })
            .then(response => response.json()) 
            .then((data)=>{
                console.log(data);
                if (!data['restarted']){
                    ANNOTATION_ENDED = true
                    target_elem.textContent = 'Restart Annotation'
                }
                
            })
        }
        
        
    })
}



function delay_run(func1, category){
    // delay run returns a promise after calling function 1
    return new Promise(func1(category))
    
    
}
function create_video_tag(){
    let video = document.createElement('video')
    video.width = 600
    video.height = 500
    video.setAttribute("controls", "controls")
    video.type = VIDEO_TYPE

    return video
}
function create_quest_ans_div({label=null, value=null, correct=null}){
    let label_value_div = document.createElement('div')
    label_value_div.className = 'row-align'

    let label_div = document.createElement('div')
    label_div.className = 'qa_label'
    label_div.innerText = label+":"
    if (correct){
        var inlines = create_inline_elemets()
        var inline_good = inlines[0]
        var inline_bad = inlines[1]
        label_div.appendChild(inline_good)
        console.log("mark good here");
        
    }
    label_value_div.appendChild(label_div)

    let value_div = document.createElement('div')
    value_div.className = 'qa_value'
    value_div.innerText = value
    label_value_div.appendChild(value_div)

    return label_value_div
}

function prepare_quest_answer_resp(quest_ans_data){
    let div = document.createElement('div')
    div.className = "edit_qa_div"
    
    for (let [label, value] of Object.entries(quest_ans_data)){
        if (label.split('-').at(-1)=='correct'){
            console.log("correct");
            let first_hypen_index = label.indexOf('-')
            let second_hypen_index = label.indexOf('-', first_hypen_index+1)
            
            label = label.slice(0, second_hypen_index)
            var label_value_div = create_quest_ans_div({label:label, value:value, correct:true})
            
        }
        else{
            var label_value_div = create_quest_ans_div({label:label, value:value})
        }
        
        div.appendChild(label_value_div)
    }
    
    return div 
}

function create_vidlist_disp_span(file_name, checked_by, status, video_url, video_similarity_score, keywords, assoc_category, project_type){
    
    
    // add video similarity confidence here.
    
    
    var inlines = create_inline_elemets()
    var inline_good = inlines[0]
    var inline_bad = inlines[1]

    let span = document.createElement('span')
    span.id = "li_"+file_name
    span.textContent = file_name
    if (checked_by != null && status==true){
        span.appendChild(inline_good)
    }
    else if(checked_by != null && status==false){
        span.appendChild(inline_bad)
    }
    span.classList.add('vid_name')

    span.addEventListener('click', (e)=>{
        let cur_span = e.target
        let processed = false
        
        if ((cur_span.textContent == 'done') || (cur_span.textContent == 'close')){
            //checks if the span has inline element, hence the parent elem changes
            let parent_elem = cur_span.parentNode
            var file_name = parent_elem.id.split('_')[1]   
            processed = true 
        }
        else {
            var file_name = cur_span.id.split('_')[1]
        }

        
        const[span_heading, br_elem, span_category] = create_vidname_category_spans(assoc_category)
        
        let vid_preview = document.getElementById('vid_preview')
        let vid_tag = document.getElementById('vid_tag')
        let video_name = document.querySelector('#video_name')
        video_name.innerHTML = ""
        vid_tag.innerHTML = ""
        
        const video = create_video_tag()
        video.src =  base_vid_src+video_url
        vid_tag.appendChild(video)

        span_heading.textContent = file_name
        video_name.appendChild(span_heading)
        video_name.appendChild(br_elem)
        video_name.appendChild(span_category)
        let keyword_tag = document.getElementById('video_keywords')
        
        keyword_tag.textContent = `Video Keywords: ${keywords}`
        

        var question_tag = document.querySelector('#question_tag')
        let cluster_keywords = document.querySelector('#cat_name')
        cluster_keywords = cluster_keywords.textContent.split('|')[0].trim()
        
        // checks if the video has been approved or rejected
        const conditions = [`${file_name}done`, 'done', `${file_name}close`, 'close']
        allow_edit_and_show_qa({checked_by:checked_by, project_type:project_type, 
            file_name:file_name, cluster_keywords:cluster_keywords, question_tag:question_tag})
        
    })

    return span

}

function allow_edit_and_show_qa({checked_by=null, project_type=null, 
                                    file_name=null, cluster_keywords=null, question_tag=null}){
    if (checked_by){
        if (project_type == "image_qa"){
        
        // console.log("filename", file_name, "cluster_keywords", cluster_keywords);
        // base_url+`/get_next_video?file_name=${file_name}&appr_rej=${appr_rej}`
        let endpoint = `${base_url}/retrieve_video_qa?file_name=${file_name}&cluster_keywords=${cluster_keywords}`
        
   

        const response = fetch(endpoint, {
            method: 'GET'
        }).then(response => response.json())
        .then((data)=>{
            let quest_ans_data = data['data']
            question_tag.innerHTML = ""
            let question_and_answers = prepare_quest_answer_resp(quest_ans_data)
            question_tag.appendChild(question_and_answers)
            
            
        })

        
    }
        let edit_btn_div = create_edit_btn({file_name:file_name, cluster_keywords:cluster_keywords, project_type:project_type})
        let edit_reponse_div = document.querySelector('#edit-reponse')
        let action_control = document.querySelector('#action-control')
        edit_reponse_div.innerHTML = ""
        action_control.innerHTML = ""
        edit_reponse_div.appendChild(edit_btn_div)
    }
    else {
        // TODO: edit shows the question and ans in editable mode
        let action_control = document.querySelector('#action-control')
        action_control.innerHTML = ""
        if(project_type == "image_qa"){
            var action_div = create_qa_btn_controls()
            question_tag.innerHTML = ""
            let form = create_video_QA_form()
            question_tag.append(form)
        }
        else if(project_type == "annotation"){
            var action_div = create_apr_rej({file_name:file_name, cluster_keywords:cluster_keywords})
            
        }
        action_control.appendChild(action_div)
        
    }
}


function fecth_all_videos_in_category(endpoint, assoc_category){
    
    endpoint = endpoint+assoc_category
    let video_list_disp = document.getElementById('video_list_disp')
    video_list_disp.innerHTML = ""
    


    const response = fetch(endpoint, {
        method: 'GET'
    })
    .then(response => response.json())
    .then((data)=>{
        let serialized_videos = data['serialized_videos']
        var project_type = data['project_type']
        
        serialized_videos.forEach((video)=>{
            let video_fields = video['fields']

            let checked_by = video_fields['checked_by']
            let file_name = video_fields['file_name']
            let status = video_fields['status'] //normall null
            let video_url = video_fields['video']
            let video_similarity_score = video_fields['video_similarity_score']
            let keywords = video_fields['keywords']
            let cur_span = create_vidlist_disp_span(file_name, checked_by, status,
                 video_url, video_similarity_score, keywords, assoc_category, project_type)
            video_list_disp.appendChild(cur_span)

            
        })  
        // Function that gets the next unprocessed video and displays it 
        get_next_video({assoc_category:assoc_category, project_type:project_type})
    })  

    

}


cat_headings.forEach((elem)=>{
    //cluster_id
    let cluster_id = elem.querySelector('.cluster_id').textContent
    let cluster_group = elem.querySelector('.cluster_group').textContent
   

    
    let text_content = elem.innerText
    let category = text_content.split('-')[0]
    // let term = category.trim().split('|')[0]
    let term = cluster_id
    
    
    // console.log('termo', term);

    let full_get_videos_per_category = get_videos_per_category+term
    // console.log("1st full_paginated_vid_url", full_paginated_vid_url);
    
    full_get_videos_per_category = full_get_videos_per_category + `&group=${cluster_group}`
    // console.log("full_get_videos_per_category ", full_get_videos_per_category);
    
    elem.addEventListener('click', ()=>{
      
        
        let assoc_category = category.split('|')[0].trim()
        // remove active class from all but the current video
        cat_headings.forEach((elem)=>{
            elem.classList.remove('active')
        })
        elem.classList.add('active')
        let cluster_id_i = document.createElement('i')
       
        cluster_id_i.textContent = cluster_id
        cluster_id_i.classList.add("visibility_hidden")
       
        cat_name.textContent = category
        
        // console.log("cat", category, "cluster", cluster_group);
        
        cat_name.classList.add('tm_headings')
        fecth_all_videos_in_category(get_videos_per_category, assoc_category)
        // fetch_vids(null, category=category, cluster_group=cluster_group)
        
   
    })
    
})

function add_active_to_span(span_id, caller=''){
    function add_active(){
        let cur_span_id = 'li_'+span_id
        let cur_span_tag = document.getElementById(cur_span_id)
        // get parent of cur_span_tag, get her children and remove active class
        let cur_span_tag_siblings = cur_span_tag.parentElement.childNodes
        cur_span_tag_siblings.forEach(elem => {
            // console.log('elem', elem);
            elem.classList.remove('active')
            
        })

        cur_span_tag.classList.add('active')
        // console.log('cur_span_tag', cur_span_tag.parentElement.childNodes);
    }
    if (caller=='default'){
        setTimeout(add_active, 600)
    }else{
        add_active()
    }
    
    
}

function mark_good_bad(file_name, appr_rej) {
    let inlines = create_inline_elemets()
    let inline_good = inlines[0]
    let inline_bad = inlines[1]
    let cur_span_id = "li_"+file_name
    let cur_span = document.getElementById(cur_span_id)

    if (appr_rej=='approve'){
        cur_span.appendChild(inline_good)
    }
    else if (appr_rej=='reject'){
        cur_span.appendChild(inline_bad)
    }
 
    return cur_span
}

function replace_rem_total_per_category({unprocessed_vids=null, total_vids=null, html_node_vid_list=null}){
    let vid_list_div = document.querySelector('#cat_name')
    console.log("vid_list_div!!", vid_list_div);
    let text_content = vid_list_div.textContent
    let cluster_keywords = text_content.split('|')[0]
    let rem_total = `|${unprocessed_vids}/${total_vids}`
    let new_text_content = cluster_keywords+rem_total
    vid_list_div.textContent = new_text_content
    
}

function replace_processed_by_all_and_user({user_processed=null, all_processed=null, processed_by_user_div=null, processed_by_all_div=null, isAdmin=null, html_node_user=null}){
    if (isAdmin){
        let total_videos = processed_by_all_div.innerText.split('/').at(1)
        let new_text_content_all = `${all_processed}/${total_videos}`
        processed_by_all_div.innerText = new_text_content_all
        
    }else{
        let text_content_user_node = processed_by_user_div.textContent
        let total_vids_category = text_content_user_node.split('/')[1]
        let new_text_content_user_node = user_processed+"/"+total_vids_category
        processed_by_user_div.textContent = new_text_content_user_node

        let text_content_all = processed_by_all_div.textContent
        let total_vids = text_content_all.split('/')[1]
        let new_text_content_all = all_processed+"/"+total_vids
        processed_by_all_div.textContent = new_text_content_all   
    }

}

function submit_video_qa_form(){
    let form_csrf_token = document.querySelector('#form-csrf-token')
    // console.log("submit form clicked", form_csrf_token);
    let csrf_token_element = form_csrf_token.elements[0]
    let csrf_token_name = csrf_token_element.name
    let csrf_token = csrf_token_element.value

    let video_filename = document.querySelector('#video_name_value').innerText
    let cluster_keyword = document.querySelector('#cat_name').innerText.split('|').at(0).trim()
    
    let vid_qa_form = document.querySelector('#video_qs_form')
    
    
    let new_form_data = new FormData()
    
    for (let i=0; i < vid_qa_form.elements.length; i++){
        let element = vid_qa_form.elements[i]
        new_form_data.append(element.name, element.value)

        
    }
    

    new_form_data.append('video_filename', video_filename)
    new_form_data.append('cluster_keyword', cluster_keyword)
    new_form_data.append(csrf_token_name, csrf_token)

    let endpoint = base_url+"/submit_vid_qa"

    let response = fetch(endpoint,{
        method: 'POST',
        body: new_form_data
    })
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
            submit_video_qa_form()
            let file_name = document.querySelector('#video_name_value').textContent
            let cluster_keyword = document.querySelector('#cat_name').innerText.split('|').at(0).trim()
            // get_next_video({file_name: file_name, assoc_category: assoc_category, appr_rej: 'approve'})
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

function show_video_in_preview({prev_file_name=null, assoc_category = null, data=null, appr_rej=null, caller='', project_type=null, isAdmin=null}){
    // console.log("logic for showing video in vid tag");
    
    const[span_heading, br_elem, span_category] = create_vidname_category_spans(assoc_category)
    let vid_preview = document.getElementById('vid_preview')
    let vid_tag = document.getElementById('vid_tag')
    let video_name = document.querySelector('#video_name')
    video_name.innerHTML = ""
    vid_tag.innerHTML = ""

    let next_video = data["serialized_next_video"][0]
   
    

    let video_fields = next_video['fields']
    let file_name = video_fields['file_name']
    let video_url = video_fields['video'] 
    let vid_keywords = video_fields['keywords']
    let keyword_tag = document.getElementById('video_keywords')
    
    keyword_tag.textContent = `Video Keywords: ${vid_keywords}`

    span_heading.textContent = file_name
    
    video_name.appendChild(span_heading)
    video_name.appendChild(br_elem)
    video_name.appendChild(span_category)

    const video = create_video_tag()
    video.src =  base_vid_src+video_url
    
    vid_tag.appendChild(video)
    if (project_type=='image_qa'){
        var action_div = create_qa_btn_controls()
        let question_tag = document.querySelector('#question_tag')
        question_tag.innerHTML = ""
        
        let form = create_video_QA_form()
        question_tag.append(form)
    
    }
    else{
        let kwargs = {file_name:file_name, assoc_category:assoc_category, project_type:project_type}
        var action_div = create_apr_rej(kwargs) 
       
    }
    // let vid_preview_childnodes = vid_preview.childNodes
    // console.log("vid_preview_childnodes");
    
    // vid_preview.lastElementChild = action_div
    let action_control = document.querySelector('#action-control')
    action_control.innerHTML = ""
    action_control.appendChild(action_div)

 
    

    if (caller=='appr_rej'){
        
        let rem_total_per_category = data["rem_total_per_category"]
        let user_all_processed = data["user_all_processed"]
        if (!isAdmin){
            // admin page not not mark span as resolved
            mark_good_bad(prev_file_name, appr_rej)

            
            
            let unprocessed_vids = rem_total_per_category[0]
            let total_vids = rem_total_per_category[1]
            let html_node_vid_list = document.getElementById('cat_name')
            
                
            var payload = [file_name, unprocessed_vids, total_vids, html_node_vid_list, user_all_processed]
            
            
        }
        else{
            var payload = [rem_total_per_category, user_all_processed]
        }

        
        return payload
    }
    
    
   return file_name 
}


function get_next_video_appr_rej({file_name=null, assoc_category=null, appr_rej=null, add_active_to_span=null, project_type=null, isAdmin=null}){
    // console.log("project_type!!!", project_type);

  
    var prev_file_name = file_name
    if (isAdmin){
        console.log("isAdmin", isAdmin, "appr_rej", appr_rej);
        var get_next_video_endpoint = base_url+`/get_next_video?file_name=${file_name}&appr_rej=${appr_rej}&is_admin=${isAdmin}`
    }
    else{
        
        var get_next_video_endpoint = base_url+`/get_next_video?file_name=${file_name}&appr_rej=${appr_rej}`
    }
    
    // get_next_video_endpoint = get_next_video_endpoint+file_name
    return fetch(get_next_video_endpoint, {
        method: 'GET'
    })
    .then(response => response.json())
    .then((data)=>{

        
        
        if (!isAdmin){
            console.log("not admin data", data);
            const[file_name_, unprocessed_vids, total_vids, html_node_vid_list, user_all_processed] = show_video_in_preview({prev_file_name:prev_file_name,  assoc_category:assoc_category, data:data, appr_rej:appr_rej, caller:'appr_rej', isAdmin:isAdmin})
            
            let all_processed = user_all_processed[1]
            let user_processed = user_all_processed[0]
            
            
            // replace the progress  span on video_list_disp div
            let processed_by_user_div = document.getElementById('processed_by_user_div')
            let processed_by_all_div = document.getElementById('processed_by_all_div')
               
        replace_rem_total_per_category({unprocessed_vids:unprocessed_vids, total_vids:total_vids})
        let html_node_category = document.getElementsByClassName('cat_headings active')[0]
        // {user_processed=null, all_processed=null, 
        //     processed_by_user_div=null, processed_by_all_div=null, 
        //     isAdmin=null, html_node_user=null}
        // replace_rem_total_per_category({user_processed:user_processed, all_processed:all_processed, processed_by_user_div:processed_by_user_div, processed_by_all_div:processed_by_all_div, html_node_category:html_node_category})

        // replace user_processed value and processed by all value
        
        
        
        let kwargs = {user_processed:user_processed, all_processed:all_processed, processed_by_user_div:processed_by_user_div, processed_by_all_div:processed_by_all_div}
        replace_processed_by_all_and_user(kwargs)
        add_active_to_span(file_name_)
        }
        else {
            const[rem_total_per_category, user_all_processed] = show_video_in_preview({prev_file_name:prev_file_name,  assoc_category:assoc_category, data:data, appr_rej:appr_rej, caller:'appr_rej', isAdmin:isAdmin})
            let all_processed = user_all_processed[1]
            let user_processed = user_all_processed[0]
            
            let processed_by_all_div = document.getElementById('processed_by_all_div')
            console.log("all_processed", all_processed);
            
            let kwargs = {all_processed:all_processed,  processed_by_all_div:processed_by_all_div, isAdmin:isAdmin}
            replace_processed_by_all_and_user(kwargs)
        }
        

        
    })
    
}

function get_next_video_defualt({assoc_category:assoc_category, add_active_to_span:add_active_to_span, project_type:project_type, isAdmin:isAdmin}){
    /**
     * Returns the next video to be display on Video display div when explore is clicked
     * @param {assoc_category} - The category the current video belongs to.
     * @returns null
     */
    if (isAdmin){
        var get_next_video_endpoint = base_url+`/get_next_video?category=${assoc_category}&is_admin=${isAdmin}`
    }else{
        var get_next_video_endpoint = base_url+`/get_next_video?category=${assoc_category}`
    }
    
    
    let response = fetch(get_next_video_endpoint, {
        method: 'GET'
    })
    .then(response => response.json())
    .then((data)=>{
       
        
        
        let file_name_ = show_video_in_preview({data:data, project_type:project_type})
        add_active_to_span(file_name_,'default')

        
    })
    

}

function get_next_video({file_name=null, assoc_category=null, appr_rej=null, project_type=null}){
    // console.log('filename', file_name);
    // var prev_file_name = file_name
    let isAdmin = null
    let admin_project_type_span = document.getElementById('project_type')
    if (admin_project_type_span){
        isAdmin = true
        
    }
    
    if (appr_rej){
        let kwargs = {file_name:file_name, assoc_category:assoc_category,
             appr_rej:appr_rej, add_active_to_span:add_active_to_span, project_type:project_type, isAdmin:isAdmin}
            //  console.log("!!..", project_type);
    
        
        
        let file_name_ = get_next_video_appr_rej(kwargs)
    }
    else{
        
        // Get nexxt video when explore is clicked
        
        let file_name_ = get_next_video_defualt({assoc_category:assoc_category, add_active_to_span:add_active_to_span, project_type:project_type, isAdmin:isAdmin})
       
        
    }
    

}

function create_inline_elemets() {
    let inline_bad = document.createElement('i')
    inline_bad.classList.add('material-symbols-outlined')
    inline_bad.style.color = 'red'
    inline_bad.textContent = 'close'
    let inline_good = document.createElement('i')
    inline_good.classList.add('material-icons')
    inline_good.style.color = 'green'
    inline_good.textContent = 'done'
    
    return [inline_good, inline_bad]
    
}

function create_vidname_category_spans(category=null) {
    let span_heading = document.createElement("span")
    span_heading.id = "video_name_value"
    let br_elem = document.createElement("br")
    let span_category = document.createElement("span")
    span_category.id = "cluster_keyword"
    if (category){
        span_category.textContent = "Cluster Keyword: " + category
    }


    return [span_heading, br_elem, span_category]
}


function create_qa_btn_controls(){
    let div = document.createElement('div')
    div.id = 'submit_qs_btn_div'
    div.classList.add('submit_qs_btn_div')

    let skip = document.createElement('input')
    skip.value = 'skip video'
    skip.classList =  "nist-button btn_qa"
    skip.type = 'button'
    
    // let submit = document.createElement('input')
    // submit.value = 'submit'
    // submit.classList =  "nist-button btn_qa"
    // submit.type = 'submit'
    

    // div.appendChild(submit)
    div.appendChild(skip)

    return div
    
}

var create_apr_rej = function appr_rej({file_name=null, assoc_category=null, caller=null, project_type=null}){
     
    
    let div = document.createElement('div')
    div.id = 'apr_rej_btn_div'
    div.classList.add('apr_rej_btn_div')

    
    let approve_input = document.createElement('input')
    approve_input.type = 'button'
    approve_input.value = 'approve'
    approve_input.className = 'nist-button btn_apr_rej'

    approve_input.addEventListener('click', ()=>{
        
        
        try {
            let end_annotation = document.getElementById('end-annotation')
            let end_annotation_inner_text = end_annotation.innerText.trim()
            if (end_annotation_inner_text == 'Restart Annotation' ){//user had already finished job so he must restart
                const appr_rej = 'approve'
                let end_annotation = document.getElementById('end-annotation')
                // console.log('annotation_ended', end_annotation);
                
                let message =  "You already finished annotation. Do you want to restart?" 
                // get_next_video_appr_rej(file_name, assoc_category, appr_rej, add_active_to_span)
                customConfirm({message:message, target_elem:end_annotation, callback:handle_confirm_yes_or_no, appr_rej:appr_rej, file_name:file_name, assoc_category:assoc_category, callback2:add_active_to_span}) ;
            }else{
                
                get_next_video({file_name: file_name, assoc_category: assoc_category, appr_rej: 'approve'})
            }
        } catch (error){
            console.log(error);
            
            get_next_video({file_name: file_name, assoc_category: assoc_category, appr_rej: 'approve'})
            
        }
        
        
        
        
   
        
    })
    div.appendChild(approve_input)

    // create reject button and add and event listener to it
    let reject_input = document.createElement('input')
    reject_input.type = 'button'
    reject_input.value = 'reject'
    reject_input.className = 'nist-button btn_apr_rej'

    reject_input.addEventListener('click', ()=>{
        try {
            let end_annotation = document.getElementById('end-annotation')
            let end_annotation_inner_text = end_annotation.innerText.trim()
            if (end_annotation_inner_text == 'Restart Annotation' ){
                const appr_rej = 'reject'
                let end_annotation = document.getElementById('end-annotation')
                // console.log('annotation_ended', end_annotation);
                
                let message =  "You already finished annotation. Do you want to restart?" 
                customConfirm({message:message, target_elem:end_annotation, callback:handle_confirm_yes_or_no, appr_rej:appr_rej, file_name:file_name, assoc_category:assoc_category, callback2:add_active_to_span}) ;
            }else{
                get_next_video({file_name: file_name, assoc_category: assoc_category, appr_rej: 'reject'})
            }
        } catch (error){
            console.log(error);
            get_next_video({file_name: file_name, assoc_category: assoc_category, appr_rej: 'reject'})
            
        }
      
    })
    div.appendChild(reject_input)

    return div
}

function create_edit_btn({file_name:file_name, cluster_keywords:cluster_keywords, project_type:project_type}){

    let  app_rej_btn_div = create_apr_rej({file_name:file_name, cluster_keywords:cluster_keywords , caller:"appr_rej_admin"})
    
    let div = document.createElement('div')
    div.id = 'edit_res'
    div.style.textAlign = 'center'
    

    let btn = document.createElement('input')
    btn.type = 'button'
    btn.value = 'edit response'
    btn.classList.add('nist-button')

    btn.addEventListener('click', ()=>{
        let edit_div = document.getElementById('edit_res')
        if (project_type=='image_qa'){
            // handle edit reponse logic for video qa
            console.log("edit response for image_qa");
            
        }
        else{

            let action_control = document.querySelector('#action-control')
            if (action_control.innerHTML == ""){
                action_control.appendChild(app_rej_btn_div)
            }else{
                action_control.innerHTML = ""
            }
            // action_control.innerHTML = ""
            

        }
        
        
    })

    div.appendChild(btn)

    return div
}


export {create_apr_rej, create_vidname_category_spans,
     create_video_tag, prepare_quest_answer_resp, create_edit_btn, create_qa_btn_controls,
    create_video_QA_form, allow_edit_and_show_qa}