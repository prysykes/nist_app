import {create_qa_btn_controls, create_video_QA_form, submit_video_qa_form, retrieve_next_video_qa} from './video_qa.js'

import {handle_show_job_summary} from './admin.js'

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
const base_vid_src = "nist_trecvid_resources/"
const mark_unavailable_url = base_url + '/mark_as_unavailable'

// let full_url_path = base_url+'/display_videos?term='
let process_user_sel_url = base_url+'/process_user_selection?selection='

// Calculate and update dashboard stats
function updateDashboardStats() {
    const totalCompletedElem = document.getElementById('total-completed')
    const totalPendingElem = document.getElementById('total-pending')

    if (!totalCompletedElem || !totalPendingElem) return

    // Get all progress elements that show approved/rejected/total format
    const progressElements = document.querySelectorAll('.progress-text.progress')

    let totalApproved = 0
    let totalRejected = 0
    let totalVideos = 0

    progressElements.forEach(elem => {
        // Text format is "a-N/r-N/t-N" - extract the numbers
        const text = elem.textContent.trim()
        const match = text.match(/a-(\d+)\/r-(\d+)\/t-(\d+)/)
        if (match) {
            totalApproved += parseInt(match[1])
            totalRejected += parseInt(match[2])
            totalVideos += parseInt(match[3])
        }
    })

    const totalCompleted = totalApproved + totalRejected
    const totalRemaining = totalVideos - totalCompleted

    totalCompletedElem.textContent = totalCompleted
    totalPendingElem.textContent = totalRemaining
}

// Run stats update on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateDashboardStats)
} else {
    updateDashboardStats()
}

// Update preview status badge
function updatePreviewStatus(status, text) {
    const previewStatus = document.getElementById('preview_status')
    if (!previewStatus) return

    const statusClasses = ['status-idle', 'status-playing', 'status-loading']
    const badge = previewStatus.querySelector('.status-badge')
    if (badge) {
        statusClasses.forEach(cls => badge.classList.remove(cls))
        badge.classList.add(`status-${status}`)
        badge.innerHTML = `<span class="status-dot"></span>${text}`
    }
}

// Update video count label
function updateVideoCountLabel(count) {
    const label = document.getElementById('video_count_label')
    if (label) {
        label.textContent = count > 0 ? `${count} videos available` : ''
    }
}

// Hide loading indicator
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('videos_loading')
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none'
    }
}

// Hide video placeholder when video loads
function hideVideoPlaceholder() {
    const placeholder = document.getElementById('video_placeholder')
    if (placeholder) {
        placeholder.style.display = 'none'
    }
}

// Show video placeholder
function showVideoPlaceholder() {
    const placeholder = document.getElementById('video_placeholder')
    if (placeholder) {
        placeholder.style.display = 'flex'
    }
}

if (login != null) {
    login.addEventListener('click', ()=>{
        tm_login_form.classList.toggle('display-none');
    })
}


if ((end_annotation==null) && (login==null)){
    // checks if you are in the admin page
    let btn_vid_upload = document.querySelector('#upload_videos')
    let closeUploadModal = document.querySelector('#close_upload_modal')
    let cancelUpload = document.querySelector('#cancel_upload')

    // Open modal
    btn_vid_upload.addEventListener('click', ()=>{
        div_vid_upld.classList.remove('display-none')
    })

    // Close modal with X button
    if (closeUploadModal) {
        closeUploadModal.addEventListener('click', ()=>{
            div_vid_upld.classList.add('display-none')
        })
    }

    // Close modal with Cancel button
    if (cancelUpload) {
        cancelUpload.addEventListener('click', ()=>{
            div_vid_upld.classList.add('display-none')
        })
    }

    // Close modal when clicking overlay background
    div_vid_upld.addEventListener('click', (e)=>{
        if (e.target === div_vid_upld) {
            div_vid_upld.classList.add('display-none')
        }
    })

    // Handle upload form submission with progress tracking
    const uploadForm = document.querySelector('#upload_form')
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUploadFormSubmit)
    }
}

// Upload progress tracking
let uploadProgressInterval = null

async function handleUploadFormSubmit(e) {
    e.preventDefault()

    const form = e.target
    const formData = new FormData(form)
    const progressSection = document.getElementById('upload_progress_section')
    const progressBar = document.getElementById('upload_progress_bar')
    const progressPercentage = document.getElementById('progress_percentage')
    const progressCount = document.getElementById('progress_count')
    const progressStatusText = document.getElementById('progress_status_text')
    const formActions = document.getElementById('upload_form_actions')

    // Show progress section and hide form actions
    progressSection.classList.remove('display-none')
    progressSection.classList.remove('completed', 'error')
    formActions.style.display = 'none'

    // Reset progress
    progressBar.style.width = '0%'
    progressPercentage.textContent = '0%'
    progressCount.textContent = 'Initializing...'
    progressStatusText.textContent = 'Starting upload...'

    try {
        // Start the upload via AJAX
        const response = await fetch(form.action || window.location.href, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })

        const data = await response.json()

        if (data.status === 'processing' && data.task_id) {
            // Upload started in background - poll for progress
            progressStatusText.textContent = 'Processing videos...'
            pollUploadProgress(data.task_id)
        } else if (data.task_id) {
            // Legacy: task_id returned after completion
            pollUploadProgress(data.task_id)
        } else if (data.status === 'success') {
            // Upload completed immediately (e.g., small batch)
            showUploadComplete(100, data.processed || 0, data.total || 0, data.message)
        } else if (data.status === 'error') {
            showUploadError(data.message || 'Upload failed')
        } else {
            // Fallback - redirect if no JSON response expected
            window.location.reload()
        }
    } catch (error) {
        console.error('Upload error:', error)
        showUploadError('An error occurred during upload. Please try again.')
    }
}

function pollUploadProgress(taskId) {
    const progressBar = document.getElementById('upload_progress_bar')
    const progressPercentage = document.getElementById('progress_percentage')
    const progressCount = document.getElementById('progress_count')
    const progressStatusText = document.getElementById('progress_status_text')

    // Clear any existing interval
    if (uploadProgressInterval) {
        clearInterval(uploadProgressInterval)
    }

    uploadProgressInterval = setInterval(async () => {
        try {
            const response = await fetch(`${base_url}/upload_progress?task_id=${taskId}`)
            const data = await response.json()

            const percent = data.percent || 0
            const processed = data.processed || 0
            const total = data.total || 0
            const status = data.status || 'processing'
            const message = data.message || 'Processing videos...'

            // Update progress UI
            progressBar.style.width = `${percent}%`
            progressPercentage.textContent = `${percent}%`
            progressCount.textContent = `${processed} / ${total} videos`
            progressStatusText.textContent = message

            if (status === 'completed') {
                clearInterval(uploadProgressInterval)
                uploadProgressInterval = null
                showUploadComplete(percent, processed, total, 'Videos uploaded successfully!')
            } else if (status === 'error') {
                clearInterval(uploadProgressInterval)
                uploadProgressInterval = null
                showUploadError(message)
            }
        } catch (error) {
            console.error('Progress poll error:', error)
        }
    }, 500) // Poll every 500ms
}

function showUploadComplete(percent, processed, total, message) {
    const progressSection = document.getElementById('upload_progress_section')
    const progressBar = document.getElementById('upload_progress_bar')
    const progressPercentage = document.getElementById('progress_percentage')
    const progressCount = document.getElementById('progress_count')
    const progressStatusText = document.getElementById('progress_status_text')

    progressSection.classList.add('completed')
    progressBar.style.width = '100%'
    progressPercentage.textContent = '100%'
    progressCount.textContent = `${processed} / ${total} videos`
    progressStatusText.textContent = message || 'Upload completed successfully!'

    // Reload page after a short delay to show the success state
    setTimeout(() => {
        window.location.reload()
    }, 1500)
}

function showUploadError(message) {
    const progressSection = document.getElementById('upload_progress_section')
    const progressStatusText = document.getElementById('progress_status_text')
    const formActions = document.getElementById('upload_form_actions')

    progressSection.classList.add('error')
    progressStatusText.textContent = message || 'An error occurred'

    // Show form actions again after a delay so user can retry
    setTimeout(() => {
        formActions.style.display = 'flex'
        progressSection.classList.remove('error')
        progressSection.classList.add('display-none')
    }, 3000)
}

// Beging function to allow a user end annotation

function handle_confirm_yes_or_no({caller1=null, caller2=null, value=null, target_elem=null}){
    if (caller1 == 'end_annotation'){
        if (value){
            // mark job_finished in user model to false
            // change the annotation ended text to end-annotation
            let usernameElem = document.querySelector('.user-name')
            if (!usernameElem) {
                console.error('Username element not found')
                return
            }
            let user = usernameElem.innerText.trim()
            let end_annotation_endpoint = `${base_url}/end_annotation?user=${user}&restart_end=true`
            fetch(end_annotation_endpoint, {
                method: 'GET'
            })
            .then(response => response.json())
            .then((data)=>{
                console.log('Restart annotation response:', data['restarted']);
                if (data['restarted']){
                    // Reload the page to get fresh state after restart
                    window.location.reload()
                }
            })
            .catch(error => {
                console.error('Restart annotation error:', error)
            })

        } else {
            // handle cancel - do nothing
        }
    } else {
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

    // Clone and replace buttons to remove old event listeners (prevents accumulation)
    const newRestartButton = restartButton.cloneNode(true);
    const newCancelButton = cancelButton.cloneNode(true);
    restartButton.parentNode.replaceChild(newRestartButton, restartButton);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

    // Handle OK button click
    newRestartButton.addEventListener('click', ()=>{
        confirm_overlay.style.display = 'none';  // Hide dialog
        let caller1 = 'end_annotation'

        callback({caller1:caller1, value:true, target_elem:target_elem});  // Pass true to callback (OK pressed)
        // handle when restart is called by appr or rej button
        if (appr_rej){
            // add logic to mark the video as approved or denied
            get_next_video_appr_rej(file_name, assoc_category, appr_rej, callback2)
            callback({caller1:caller1, caller2:appr_rej, value:true, target_elem:target_elem});


        }
    });

    // Handle Cancel button click
    newCancelButton.addEventListener('click', ()=> {
        confirm_overlay.style.display = 'none';  // Hide dialog
        let caller1 = 'end_annotation'
        callback({caller1:caller1, value:false, target_elem:target_elem});  // Pass false to callback (Cancel pressed)
    });

}

// End Annotation button handler
let end_annotation_btn = document.querySelector('#end-annotation')
if (end_annotation_btn) {
    end_annotation_btn.addEventListener('click', (e)=> {
        console.log('End annotation clicked');

        let target_elem = end_annotation_btn

        if (target_elem.innerText.trim().includes('Restart Annotation')){
            let message = "You already finished annotation. Do you want to restart?"
            customConfirm({message:message, target_elem:target_elem, callback:handle_confirm_yes_or_no});
        } else {
            let usernameElem = document.querySelector('.user-name')
            if (!usernameElem) {
                console.error('Username element not found')
                return
            }
            let user = usernameElem.innerText.trim()
            let end_annotation_endpoint = `${base_url}/end_annotation?user=${user}&restart_end=false`

            fetch(end_annotation_endpoint, {
                method: 'GET'
            })
            .then(response => response.json())
            .then((data)=>{
                console.log('End annotation response:', data);
                if (!data['restarted']){
                    ANNOTATION_ENDED = true
                    target_elem.textContent = 'Restart Annotation'
                }
            })
            .catch(error => {
                console.error('End annotation error:', error)
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
function create_quest_ans_div({label=null, value=null, assoc_id=null, correct=null}){
    let label_value_div = document.createElement('div')
    label_value_div.className = 'label-value-div'

    // Style for grid layout
    label_value_div.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: ${correct ? '#f0fdf4' : '#ffffff'};
    `

    // Add correct-answer class for highlighting
    if (correct) {
        label_value_div.classList.add('correct-answer')
    }

    let id_div = document.createElement('div')
    id_div.classList.add('qa_ids')
    id_div.id = `label-${assoc_id}`
    id_div.style.display = 'none'  // Hide the ID div

    label_value_div.appendChild(id_div)

    let label_div = document.createElement('div')
    label_div.className = 'qa-label'
    label_div.style.cssText = `
        font-weight: 600;
        font-size: 14px;
        color: #374151;
    `

    // Format label text nicely
    let formattedLabel = label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    label_div.innerText = formattedLabel

    if (correct){
        let correctBadge = document.createElement('span')
        correctBadge.className = 'correct-badge'
        correctBadge.innerHTML = '<span class="material-icons" style="font-size: 14px; vertical-align: middle; margin-left: 6px; color: #10b981;">check_circle</span>'
        label_div.appendChild(correctBadge)
    }
    label_value_div.appendChild(label_div)

    let value_div = document.createElement('div')
    value_div.className = 'qa-value'
    value_div.style.cssText = `
        font-size: 14px;
        color: #6b7280;
        line-height: 1.5;
        word-wrap: break-word;
    `
    value_div.innerText = value
    label_value_div.appendChild(value_div)

    return label_value_div
}
// prepare_quest_answer_resp({data:data, isEdit:isEdit})
function prepare_quest_answer_resp({quest_ans_data=null, isEdit=null}){

    let question = quest_ans_data['question']


    let div = document.createElement('div')
    div.className = "edit_qa_div"

    // Add grid layout for compact 2-row display
    div.style.cssText = `
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
        align-items: start;
        margin: 20px 0;
    `

    if (question == null){
        let label = "No QandA"
        let value = "User rejected"
        var label_value_div = create_quest_ans_div({label:label, value:value})
        div.appendChild(label_value_div)

    }else{
        for (let [label, value] of Object.entries(quest_ans_data)){

            if (label.split('-').at(-1)=='correct'){
                let first_hypen_index = label.indexOf('-')
                let second_hypen_index = label.indexOf('-', first_hypen_index+1)
                let assoc_id = value['id']
                let assoc_value = value["value"]
                label = label.slice(0, second_hypen_index)
                var label_value_div = create_quest_ans_div({label:label, value:assoc_value, assoc_id:assoc_id, correct:true})

            }
            else{
                let assoc_id = value['id']
                let assoc_value = value["value"]
                var label_value_div = create_quest_ans_div({label:label, value:assoc_value, assoc_id:assoc_id})
            }

            div.appendChild(label_value_div)
        }
    }



    return div
}

function create_youtube_iframe(youtube_vid_id){
    let iframe = document.createElement('iframe')
    let iframe_src = `https://www.youtube.com/embed/${youtube_vid_id}?si=AID4kFGq8mcMy4MY&output=embed`
    let referrerpolicy = "strict-origin-when-cross-origin"
    let width = "560"
    let height = "315"

    iframe.setAttribute('src', iframe_src)
    iframe.setAttribute('width', width)
    iframe.setAttribute('height', height)
    iframe.setAttribute('referrerpolicy', referrerpolicy)

    return iframe

}

function create_vidlist_disp_span(file_name, checked_by, status, video_url, video_similarity_score, keywords, assoc_category, project_type, youtube_vid_id){
    
    // add video similarity confidence here.
    
    
    var inlines = create_inline_elemets()
    var inline_good = inlines[0]
    var inline_bad = inlines[1]

    let span = document.createElement('span')
    span.id = "li_"+file_name
    span.textContent = file_name
    
    
    if (checked_by != null && status==true){
        span.appendChild(inline_good)
        span.classList.add('processed-item')
    }
    else if(checked_by != null && status==false){
        span.appendChild(inline_bad)
        span.classList.add('processed-item')
    }
    span.classList.add('vid_name')
    
    span.addEventListener('click', (e)=>{
        let cur_span = e.target
        let processed = false
        let clicked_span = span  // Reference to the outer span element

        if ((cur_span.textContent == 'done') || (cur_span.textContent == 'close')){
            //checks if the span has inline element, hence the parent elem changes
            let parent_elem = cur_span.parentNode
            var file_name = parent_elem.id.split('_')[1]
            clicked_span = parent_elem
            processed = true
        }
        else {
            var file_name = cur_span.id.split('_')[1]
            clicked_span = cur_span
        }

        // Highlight the clicked video
        let video_list = document.getElementById('video_list_disp')
        if (video_list) {
            let all_videos = video_list.querySelectorAll('.vid_name')
            all_videos.forEach(elem => elem.classList.remove('active'))
            clicked_span.classList.add('active')
        }

        const[span_heading, br_elem, span_category] = create_vidname_category_spans(assoc_category)
        
        let vid_preview = document.getElementById('vid_preview')
        let vid_tag = document.getElementById('vid_tag')
        let video_name = document.querySelector('#video_name')
        video_name.innerHTML = ""
        vid_tag.innerHTML = ""
        
        // Prioritize YouTube videos if youtube_vid_id exists
        if (youtube_vid_id && youtube_vid_id !== 'null' && youtube_vid_id !== 'None') {
            let iframe = create_youtube_iframe(youtube_vid_id)
            vid_tag.appendChild(iframe)
            hideVideoPlaceholder()
            updatePreviewStatus('playing', 'Playing')
        }
        else if (video_url && video_url !== '' && video_url !== 'None' && video_url !== 'null') {
            const video = create_video_tag()

            // console.log(`video_url: ${video_url} \n file_name : ${file_name}`);

            let video_path = base_vid_src+video_url+'/'+`${file_name}`
            video.src = video_path
            vid_tag.appendChild(video)
            hideVideoPlaceholder()
            updatePreviewStatus('playing', 'Playing')
        }
        else {
            console.warn('No valid video source found for:', file_name)
            showVideoPlaceholder()
            updatePreviewStatus('idle', 'No video')
        }


        span_heading.textContent = file_name
        video_name.appendChild(span_heading)
        video_name.appendChild(br_elem)
        video_name.appendChild(span_category)
        let keyword_tag = document.getElementById('video_keywords')
        
        keyword_tag.textContent = `Video Keywords: ${keywords}`
        

        var question_tag = document.querySelector('#question_tag')
        let cluster_keywords = document.querySelector('#cat_name .category-label-text')
        cluster_keywords = cluster_keywords ? cluster_keywords.textContent.trim() : document.querySelector('#cat_name').textContent.trim()

        // Check if video was recently processed (dataset will be set)
        // Otherwise use the original checked_by value
        let current_checked_by = clicked_span.dataset.checkedBy ? clicked_span.dataset.checkedBy : checked_by

        // checks if the video has been approved or rejected
        const conditions = [`${file_name}done`, 'done', `${file_name}close`, 'close']
        allow_edit_and_show_qa({checked_by:current_checked_by, project_type:project_type,
            file_name:file_name, cluster_keywords:cluster_keywords, question_tag:question_tag})
        
    })

    return span

}

function allow_edit_and_show_qa({checked_by=null, project_type=null, 
                                   file_name=null, cluster_keywords=null, question_tag=null, annotator:annotator}){
    
    if (checked_by){
        if (project_type == "video_qa"){
            // retrieve associated QA data for a particular video
            if (annotator==undefined){
                
                var endpoint = `${base_url}/retrieve_video_qa?file_name=${file_name}&cluster_keywords=${cluster_keywords}`
            }else{
                var endpoint = `${base_url}/retrieve_video_qa?file_name=${file_name}&cluster_keywords=${cluster_keywords}&annotator=${annotator}`
            }

            const response = fetch(endpoint, {
                method: 'GET'
            }).then(response => response.json())
            .then((data)=>{


                let quest_ans_data = data['data']

                question_tag.innerHTML = ""
                question_tag.className = "qs_default"
                let question_and_answers = prepare_quest_answer_resp({quest_ans_data:quest_ans_data})
                question_tag.appendChild(question_and_answers)

                // Create edit button AFTER Q&A data is loaded and displayed
                let edit_btn_div = create_edit_btn({file_name:file_name, cluster_keywords:cluster_keywords, project_type:project_type})
                let edit_reponse_div = document.querySelector('#edit-reponse')
                let action_control = document.querySelector('#action-control')
                edit_reponse_div.innerHTML = ""
                action_control.innerHTML = ""
                action_control.appendChild(edit_btn_div)
            })
            .catch((error) => {
                console.error('Error fetching Q&A data:', error)
            })
        } else {
            // For non-video_qa projects that are processed, show edit button
            let edit_btn_div = create_edit_btn({file_name:file_name, cluster_keywords:cluster_keywords, project_type:project_type})
            let edit_reponse_div = document.querySelector('#edit-reponse')
            let action_control = document.querySelector('#action-control')
            edit_reponse_div.innerHTML = ""
            action_control.innerHTML = ""
            action_control.appendChild(edit_btn_div)
        }
    }

    else {
        // TODO: edit shows the question and ans in editable mode

        let action_control = document.querySelector('#action-control')
        let edit_reponse = document.querySelector('#edit-reponse')
        edit_reponse.innerHTML = ""
        action_control.innerHTML = ""
        if(project_type == "video_qa"){
            var action_div = create_qa_btn_controls()
            question_tag.innerHTML = ""
            let form = create_video_QA_form()
            question_tag.append(form)
        }
        else if(project_type == "annotation"){
            var action_div = create_apr_rej({file_name:file_name, cluster_keywords:cluster_keywords})
            
        }
        
        
        action_control.appendChild(action_div)

        if (project_type == 'video_qa'){
            // adds mark as unavailable when a video is clicked
            let catLabel = document.querySelector('#cat_name .category-label-text')
            let category = catLabel ? catLabel.textContent.trim() : document.querySelector('#cat_name').textContent.trim()
            let project_name = category.split('_')[0]
      
            let kwargs = {project_type:project_type, project_name:project_name, file_name:file_name, category:category}
            
            const mark_unavailable = show_mark_unavailable(kwargs)
            
            let submit_qs_btn_div = document.querySelector('#submit_qs_btn_div')
           
            
            
            submit_qs_btn_div.appendChild(mark_unavailable)
            
            
        }
        
    }
}


function fecth_all_videos_in_category(endpoint, assoc_category){

    endpoint = endpoint+assoc_category
    let video_list_disp = document.getElementById('video_list_disp')
    video_list_disp.innerHTML = ""
    const response = fetch(endpoint, {
        method: 'GET',
        cache: 'no-store'
    })
    .then(response => response.json())
    .then((data)=>{
        let serialized_videos = data['serialized_videos']
        var project_type = data['project_type']

        serialized_videos.forEach((video)=>{
            // console.log("video['fields']", video['fields']);

            let video_fields = video['fields']

            let checked_by = video_fields['checked_by']
            let file_name = video_fields['file_name']
            let status = video_fields['status'] //normall null
            let video_url = video_fields['video_path']
            let youtube_vid_id = video_fields['youtube_vid_id']
            let video_similarity_score = video_fields['video_similarity_score']
            let keywords = video_fields['keywords']
            let is_available = video_fields['is_available']
            // console.log('vid filename', file_name);

            let cur_span = create_vidlist_disp_span(file_name, checked_by, status,
                 video_url, video_similarity_score, keywords, assoc_category, project_type, youtube_vid_id)



            video_list_disp.appendChild(cur_span)


        })

        // Hide loading indicator and update video count
        hideLoadingIndicator()
        updateVideoCountLabel(serialized_videos.length)

        // Function that gets the next unprocessed video and displays it
        // Once a category is clicked
        get_next_video({assoc_category:assoc_category, project_type:project_type})
    })
}


cat_headings.forEach((elem)=>{
    //cluster_id
    let cluster_id = elem.querySelector('.cluster_id').textContent
    let cluster_group = elem.querySelector('.cluster_group').textContent
   
    let term = cluster_id
    
    
    // console.log('termo', term);

    let full_get_videos_per_category = get_videos_per_category+term
    // console.log("1st full_paginated_vid_url", full_paginated_vid_url);
    
    full_get_videos_per_category = full_get_videos_per_category + `&group=${cluster_group}`
    // console.log("full_get_videos_per_category ", full_get_videos_per_category);
    
    elem.addEventListener('click', ()=>{


        let assoc_category = elem.querySelector('.category-name').textContent.trim()
        // remove active class from all but the current video
        cat_headings.forEach((elem)=>{
            elem.classList.remove('active')
        })
        elem.classList.add('active')
        let cluster_id_i = document.createElement('i')

        cluster_id_i.textContent = cluster_id
        cluster_id_i.classList.add("visibility_hidden")

        // Update panel title with category name and progress
        let cleanCategory = assoc_category.trim()

        // Extract progress info from the card's progress-text element (format: "approved/rejected/total")
        let progressElem = elem.querySelector('.progress-text')
        let progressText = ''
        if (progressElem) {
            let match = progressElem.textContent.trim().match(/a-\d+\/r-\d+\/t-\d+/)
            progressText = match ? match[0] : ''
        }

        // Create styled category label with progress badge
        cat_name.innerHTML = `
            <span class="category-label-text">${cleanCategory}</span>
            ${progressText ? `<span class="category-label-progress">${progressText}</span>` : ''}
        `

        // Show loading indicator
        const loadingIndicator = document.getElementById('videos_loading')
        if (loadingIndicator) {
            loadingIndicator.style.display = 'flex'
        }

        // Hide empty state
        const emptyState = document.getElementById('video_list_empty')
        if (emptyState) {
            emptyState.style.display = 'none'
        }

        // Reset preview status
        updatePreviewStatus('idle', 'Ready')

        // console.log("cat", category, "cluster", cluster_group);

        cat_name.classList.remove('tm_headings')
        fecth_all_videos_in_category(get_videos_per_category, assoc_category)
        // fetch_vids(null, category=category, cluster_group=cluster_group)
        
        
   
    })

})

// Bulk approve/reject on category card hover (annotation projects only)
;(function initBulkCategoryActions() {
    let projectTypeElem = document.querySelector('#project_type_user_pg')
    if (!projectTypeElem) return
    let projectType = projectTypeElem.textContent.trim()
    if (projectType !== 'annotation') return

    cat_headings.forEach((cardElem) => {
        let bulkActionsDiv = cardElem.querySelector('.category-bulk-actions')
        if (!bulkActionsDiv) return

        let approveBtn = bulkActionsDiv.querySelector('.bulk-approve-btn')
        let rejectBtn = bulkActionsDiv.querySelector('.bulk-reject-btn')

        approveBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            handleBulkAction(cardElem, 'approve')
        })

        rejectBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            handleBulkAction(cardElem, 'reject')
        })
    })

    function handleBulkAction(cardElem, action) {
        let categoryName = cardElem.querySelector('.category-name').textContent.trim()
        let encodedCategory = encodeURIComponent(categoryName)
        let endpoint = `${base_url}/bulk_approve_reject_category?cluster_keywords=${encodedCategory}&action=${action}`

        // Disable buttons during request
        let btns = cardElem.querySelectorAll('.bulk-approve-btn, .bulk-reject-btn')
        btns.forEach(b => { b.disabled = true; b.style.opacity = '0.5' })

        fetch(endpoint, { method: 'GET', cache: 'no-store' })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        let errMsg = text
                        try { errMsg = JSON.parse(text).error } catch(e) {}
                        throw new Error(errMsg || `Server error ${response.status}`)
                    })
                }
                return response.json()
            })
            .then((data) => {
                if (!data || data.status !== 'success') {
                    alert(`Bulk ${action} failed: ${(data && data.error) || 'Unknown error'}`)
                    return
                }

                console.log(`Bulk ${action} result:`, `updated=${data.updated_count}`, `verified=${data.verified_count}`, `approved=${data.cat_approved} rejected=${data.cat_rejected} total=${data.total}`)

                // Flash the card to give visual feedback
                let flashColor = action === 'approve' ? '#d1fae5' : '#fee2e2'
                cardElem.style.transition = 'background-color 0.3s'
                cardElem.style.backgroundColor = flashColor
                setTimeout(() => { cardElem.style.backgroundColor = '' }, 800)

                // Update the progress text on the category card
                let progressSpan = cardElem.querySelector('.progress-text')
                if (progressSpan) {
                    let svgContent = progressSpan.querySelector('svg')
                    let svgHtml = svgContent ? svgContent.outerHTML : ''
                    progressSpan.innerHTML = `${svgHtml} a-${data.cat_approved}/r-${data.cat_rejected}/t-${data.total}`
                }

                // Update global header progress counters
                let processedByUserDiv = document.getElementById('processed_by_user_div')
                if (processedByUserDiv) {
                    let totalUserAssigned = processedByUserDiv.textContent.split('/')[1]
                    processedByUserDiv.textContent = `${data.user_processed}/${totalUserAssigned}`
                }

                let processedByAllDiv = document.getElementById('processed_by_all_div')
                if (processedByAllDiv) {
                    let totalAll = processedByAllDiv.textContent.split('/')[1]
                    processedByAllDiv.textContent = `${data.accepted_videos}/${totalAll}`
                }

                // Update approved/rejected counters
                let userApprovedDiv = document.getElementById('user_approved_div')
                if (userApprovedDiv) {
                    userApprovedDiv.textContent = data.user_approved
                }
                let userRejectedDiv = document.getElementById('user_rejected_div')
                if (userRejectedDiv) {
                    userRejectedDiv.textContent = data.user_rejected
                }

                // Open this category and reload the video list from server
                // so the user immediately sees all videos marked as approved/rejected
                cardElem.click()
            })
            .catch((error) => {
                alert(`Bulk ${action} error: ${error.message}`)
            })
            .finally(() => {
                btns.forEach(b => { b.disabled = false; b.style.opacity = '' })
            })
    }
})()

function add_active_to_span(span_id, caller=''){
    function add_active(){
        let video_list = document.getElementById('video_list_disp')
        if (!video_list) return

        // Remove active class from all videos
        let all_videos = video_list.querySelectorAll('.vid_name')
        all_videos.forEach(elem => {
            elem.classList.remove('active')
        })

        // Find the first non-processed video (doesn't have 'processed-item' class)
        let first_unprocessed = video_list.querySelector('.vid_name:not(.processed-item)')
        if (first_unprocessed) {
            first_unprocessed.classList.add('active')
        } else {
            // If all videos are processed, highlight the first one
            let first_video = video_list.querySelector('.vid_name')
            if (first_video) {
                first_video.classList.add('active')
            }
        }
    }
    if (caller=='default'){
        // delay adding active until page is loaded
        setTimeout(add_active, 600)
    } else {
        // Delay slightly to allow mark_good_bad animation to start
        setTimeout(add_active, 50)
    }


}

function mark_good_bad(file_name, appr_rej) {
    let inlines = create_inline_elemets()
    let inline_good = inlines[0]
    let inline_bad = inlines[1]
    let cur_span_id = "li_"+file_name
    let cur_span = document.getElementById(cur_span_id)

    if (!cur_span) return cur_span

    // Check if already marked by looking for existing icons - more robust than class check
    let existingIcons = cur_span.querySelectorAll('i')
    for (let icon of existingIcons) {
        if (icon.textContent === 'done' || icon.textContent === 'close') {
            return cur_span  // Already has an icon, don't add another
        }
    }

    if (appr_rej=='approve'){
        cur_span.appendChild(inline_good)
    }
    else if (appr_rej=='reject'){
        cur_span.appendChild(inline_bad)
    }

    // Mark as processed immediately so add_active_to_span can skip it
    cur_span.classList.add('processed-item')

    // Animate to bottom of list
    let parent = cur_span.parentElement
    if (parent) {
        // Add transition class for smooth animation
        cur_span.classList.add('moving-to-bottom')

        // After animation completes, move to bottom
        setTimeout(() => {
            cur_span.classList.remove('moving-to-bottom')
            parent.appendChild(cur_span)
        }, 400)
    }

    return cur_span
}

function replace_rem_total_per_category({approved_vids=null, rejected_vids=null, total_vids=null}){
    let vid_list_div = document.querySelector('#cat_name')
    let labelText = vid_list_div.querySelector('.category-label-text')
    let progressBadge = vid_list_div.querySelector('.category-label-progress')
    let newProgress = `a-${approved_vids}/r-${rejected_vids}/t-${total_vids}`
    if (progressBadge) {
        progressBadge.textContent = newProgress
    } else if (labelText) {
        let span = document.createElement('span')
        span.className = 'category-label-progress'
        span.textContent = newProgress
        vid_list_div.appendChild(span)
    }

    // Also update the sidebar card progress text for the active category
    let activeCard = document.querySelector('.cat_headings.active .progress-text')
    if (activeCard) {
        let svgContent = activeCard.querySelector('svg')
        let svgHtml = svgContent ? svgContent.outerHTML : ''
        activeCard.innerHTML = `${svgHtml} ${newProgress}`
    }
}

function replace_processed_by_all_and_user({user_processed=null, all_processed=null, processed_by_user_div=null, processed_by_all_div=null, isAdmin=null, html_node_user=null, user_approved=null, user_rejected=null}){
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

        // Update approved/rejected counters
        if (user_approved !== null) {
            let approvedDiv = document.getElementById('user_approved_div')
            if (approvedDiv) approvedDiv.textContent = user_approved
        }
        if (user_rejected !== null) {
            let rejectedDiv = document.getElementById('user_rejected_div')
            if (rejectedDiv) rejectedDiv.textContent = user_rejected
        }
    }

}

function show_mark_unavailable({project_type, project_name, file_name, category}){
    const button = document.createElement('input')
    button.type = 'button'
    button.value = 'Mark as Unavailable'
    button.classList.add('nist-button')

    button.addEventListener('click', ()=>{
        
        let full_mark_unavailable_url = mark_unavailable_url + `?category=${category}&filename=${file_name}&project_name=${project_name}`
        
        fetch(full_mark_unavailable_url , {

        })
        .then(response => response.json())
        .then((data)=>{
            let isAdmin = false
            let file_name = data['filename']
            const span_id = `li_${file_name}`
            let vid_filename_span = document.getElementById(span_id)
            vid_filename_span.classList.add('display-none')
            let file_name_ = get_next_video_defualt({assoc_category:category, add_active_to_span:add_active_to_span, 
                project_type:project_type, isAdmin:isAdmin})
            // fetch next video

        } );
    })
   
    const span_id = `li_${file_name}`
    
    return button

}

function show_video_in_preview({prev_file_name=null, assoc_category = null, data=null, appr_rej=null, caller='', project_type=null, isAdmin=null}){
    const[span_heading, br_elem, span_category] = create_vidname_category_spans(assoc_category)
    let vid_preview = document.getElementById('vid_preview')
    let vid_tag = document.getElementById('vid_tag')
    let video_name = document.querySelector('#video_name')
    video_name.innerHTML = ""
    vid_tag.innerHTML = ""

    // Check if there are no more videos to process
    let serialized_videos = data["serialized_next_video"]
    if (!serialized_videos || serialized_videos.length === 0) {
        // No more videos in this category
        span_heading.textContent = "No more videos to process"
        video_name.appendChild(span_heading)

        // Only show completion message if ALL videos in the category are processed
        let rem_total_per_category = data["rem_total_per_category"] || [0, 0, 0]
        let approved_count = rem_total_per_category[0]
        let rejected_count = rem_total_per_category[1]
        let total_count = rem_total_per_category[2]
        let unprocessed_count = total_count - approved_count - rejected_count

        if (unprocessed_count === 0) {
            let no_videos_msg = document.createElement('p')
            no_videos_msg.textContent = "You have completed all videos in this category!"
            no_videos_msg.style.textAlign = "center"
            no_videos_msg.style.color = "green"
            no_videos_msg.style.fontWeight = "bold"
            vid_tag.appendChild(no_videos_msg)
        }

        // Return appropriate payload for the caller
        if (caller === 'appr_rej') {
            let user_all_processed = data["user_all_processed"] || [0, 0]
            if (!isAdmin) {
                mark_good_bad(prev_file_name, appr_rej)
                return [null, rem_total_per_category[0], rem_total_per_category[1], rem_total_per_category[2], null, user_all_processed]
            } else {
                return [rem_total_per_category, user_all_processed]
            }
        }
        return null
    }

    let next_video = serialized_videos[0]
    let video_fields = next_video['fields']
    let file_name = video_fields['file_name']
    let video_url = video_fields['video_path'] 
    let vid_keywords = video_fields['keywords']
    let status = video_fields['status']
    let video_path = video_fields['video_path']
    let video_similarity_score = video_fields['video_similarity_score']
    let youtube_vid_id = video_fields['youtube_vid_id']
    let keyword_tag = document.getElementById('video_keywords')    
    
    keyword_tag.textContent = `Video Keywords: ${vid_keywords}`

    span_heading.textContent = file_name
    
    video_name.appendChild(span_heading)
    video_name.appendChild(br_elem)
    video_name.appendChild(span_category)

    // Prioritize YouTube videos if youtube_vid_id exists
    if (youtube_vid_id && youtube_vid_id !== 'null' && youtube_vid_id !== 'None') {
        let iframe = create_youtube_iframe(youtube_vid_id)
        vid_tag.appendChild(iframe)
        hideVideoPlaceholder()
        updatePreviewStatus('playing', 'Playing')
    }
    else if (video_url && video_url !== '' && video_url !== 'None' && video_url !== 'null') {
        const video = create_video_tag()
        let video_path = base_vid_src+video_url+'/'+`${file_name}`
        video.src = video_path
        vid_tag.appendChild(video)
        hideVideoPlaceholder()
        updatePreviewStatus('playing', 'Playing')
    }
    else {
        console.warn('No valid video source found for:', file_name)
        showVideoPlaceholder()
        updatePreviewStatus('idle', 'No video')
    }


    if (project_type=='video_qa'){
        
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

    let action_control = document.querySelector('#action-control')
    action_control.innerHTML = ""
    
    action_control.appendChild(action_div)
    if (project_type == 'video_qa'){
        
        const catLabel = document.querySelector('#cat_name .category-label-text')
        const category = catLabel ? catLabel.textContent.trim() : document.getElementById('cat_name').textContent.trim()
        let project_name = category.split('_')[0]
        
        let kwargs = {project_type:project_type, project_name:project_name, file_name:file_name, category:category}
        const mark_unavailable = show_mark_unavailable(kwargs)
        let submit_qs_btn_div = document.querySelector('#submit_qs_btn_div')
        submit_qs_btn_div.appendChild(mark_unavailable)
        
        
    }
    

    if (caller=='appr_rej'){
        
        let rem_total_per_category = data["rem_total_per_category"]
        let user_all_processed = data["user_all_processed"]
        if (!isAdmin){

            // admin page not not mark span as resolved
            mark_good_bad(prev_file_name, appr_rej)

            let approved_vids = rem_total_per_category[0]
            let rejected_vids = rem_total_per_category[1]
            let total_vids = rem_total_per_category[2]
            let html_node_vid_list = document.getElementById('cat_name')


            var payload = [file_name, approved_vids, rejected_vids, total_vids, html_node_vid_list, user_all_processed]
            
            
        }
        else{
            console.log("isAdmin", isAdmin);
            var payload = [rem_total_per_category, user_all_processed]
        }

        
        return payload
    }
    
    
   return file_name 
}


function get_next_video_appr_rej({file_name=null, assoc_category=null, appr_rej=null, add_active_to_span=null, project_type=null, isAdmin=null, IsAdminPage=null}){
    // console.log("project_type!!!", project_type);
    
    var prev_file_name = file_name
    if (isAdmin){
        if (IsAdminPage){
            // retrive the clicked submit btn
            const target_btn = document.querySelector('input[name="submit-vid-qa"]')
            if (target_btn.classList.contains('from-edit')){
                let admin_edit = true
                var get_next_video_endpoint = base_url+`/get_next_video?file_name=${file_name}&appr_rej=${appr_rej}&is_admin=${isAdmin}&from_admin_edit=${admin_edit}`
            }
          
            
        }else{
            var get_next_video_endpoint = base_url+`/get_next_video?file_name=${file_name}&appr_rej=${appr_rej}&is_admin=${isAdmin}`
        }
        
        
    }
    else if(project_type){
        var get_next_video_endpoint = base_url+`/get_next_video?file_name=${file_name}&appr_rej=${appr_rej}&project_type=${project_type}`
    }
    else{
        
        var get_next_video_endpoint = base_url+`/get_next_video?file_name=${file_name}&appr_rej=${appr_rej}`
    }
    
    let isIframe = false
    // get_next_video_endpoint = get_next_video_endpoint+file_name
    return fetch(get_next_video_endpoint, {
        method: 'GET'
    })
    .then(response => response.json())
    .then((data)=>{

        if (!isAdmin){
            let vid_tag = document.querySelector('#vid_tag')
            if (vid_tag.contains(document.querySelector('iframe'))){
                isIframe = true
            }
            const result = show_video_in_preview({prev_file_name:prev_file_name,  assoc_category:assoc_category, data:data, appr_rej:appr_rej, caller:'appr_rej', isAdmin:isAdmin, project_type:project_type})

            // Handle case when no more videos
            if (!result || result[0] === null) {
                // Update progress counters even when no more videos
                let user_all_processed = result ? result[5] : [0, 0]
                let approved_vids = result ? result[1] : 0
                let rejected_vids = result ? result[2] : 0
                let total_vids = result ? result[3] : 0

                let all_processed = user_all_processed[1]
                let user_processed = user_all_processed[0]

                let processed_by_user_div = document.getElementById('processed_by_user_div')
                let processed_by_all_div = document.getElementById('processed_by_all_div')

                replace_rem_total_per_category({approved_vids:approved_vids, rejected_vids:rejected_vids, total_vids:total_vids})

                let kwargs = {user_processed:user_processed, all_processed:all_processed, processed_by_user_div:processed_by_user_div, processed_by_all_div:processed_by_all_div, user_approved:data.user_approved, user_rejected:data.user_rejected}
                replace_processed_by_all_and_user(kwargs)
                return
            }

            const[file_name_, approved_vids, rejected_vids, total_vids, html_node_vid_list, user_all_processed] = result

            let all_processed = user_all_processed[1]
            let user_processed = user_all_processed[0]

            // replace the progress  span on video_list_disp div
            let processed_by_user_div = document.getElementById('processed_by_user_div')
            let processed_by_all_div = document.getElementById('processed_by_all_div')

            replace_rem_total_per_category({approved_vids:approved_vids, rejected_vids:rejected_vids, total_vids:total_vids})
            let html_node_category = document.getElementsByClassName('cat_headings active')[0]

            let kwargs = {user_processed:user_processed, all_processed:all_processed, processed_by_user_div:processed_by_user_div, processed_by_all_div:processed_by_all_div, user_approved:data.user_approved, user_rejected:data.user_rejected}
            replace_processed_by_all_and_user(kwargs)
            add_active_to_span(file_name_)
        }
        else {
            const[rem_total_per_category, user_all_processed] = show_video_in_preview({prev_file_name:prev_file_name,  assoc_category:assoc_category, data:data, appr_rej:appr_rej, caller:'appr_rej', isAdmin:isAdmin})
            let all_processed = user_all_processed[1]
            let user_processed = user_all_processed[0]
            
            let processed_by_all_div = document.getElementById('processed_by_all_div')
           
            
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
    }).catch((error)=>{
        console.log(error);
        
    })  

}

function get_next_video({file_name=null, assoc_category=null, appr_rej=null, project_type=null}){
    
    // var prev_file_name = file_name
    let isAdmin = false
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
        
        // Get next video when explore is clicked
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




var create_apr_rej = function appr_rej({file_name=null, assoc_category=null, caller=null, project_type=null}){
    
    
    let div = document.createElement('div')
    div.id = 'apr_rej_btn_div'
    div.classList.add('apr_rej_btn_div')

    
    let approve_input = document.createElement('input')
    approve_input.type = 'button'
    approve_input.value = 'approve'
    approve_input.className = 'nist-button btn_apr_rej'

    approve_input.addEventListener('click', ()=>{
        // Get project type
        let project_type_elem = document.querySelector('#project_type')
        let current_project_type = project_type_elem ? project_type_elem.innerText.trim() : project_type

        // For video_qa projects, use different logic (admin review - don't load next video)
        if (current_project_type === 'video_qa') {
            console.log('Approving video_qa:', file_name, assoc_category)

            // Mark video as approved in database without loading next video
            let form_csrf_token = document.querySelector('#form-csrf-token')
            let csrf_token_element = form_csrf_token.elements[0]
            let csrf_token = csrf_token_element.value

            let formData = new FormData()
            formData.append('csrfmiddlewaretoken', csrf_token)
            formData.append('file_name', file_name)
            formData.append('cluster_keywords', assoc_category)
            formData.append('appr_rej', 'approve')

            fetch(`${base_url}/admin_approve_reject_video`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Mark the video as approved in the sidebar
                    mark_good_bad(file_name, 'approve')
                    console.log('Video approved successfully')
                } else {
                    console.error('Error approving video:', data.message)
                }
            })
            .catch(error => {
                console.error('Error approving video:', error)
            })
        } else {
            // Original annotation project logic
            try {
                let end_annotation = document.getElementById('end-annotation')
                let end_annotation_inner_text = end_annotation.innerText.trim()
                if (end_annotation_inner_text == 'Restart Annotation' ){//user had already finished job so he must restart
                    const appr_rej = 'approve'
                    let end_annotation = document.getElementById('end-annotation')

                    let message =  "You already finished annotation. Do you want to restart?"
                    customConfirm({message:message, target_elem:end_annotation, callback:handle_confirm_yes_or_no, appr_rej:appr_rej, file_name:file_name, assoc_category:assoc_category, callback2:add_active_to_span}) ;
                }else{
                    get_next_video({file_name: file_name, assoc_category: assoc_category, appr_rej: 'approve'})
                }
            } catch (error){
                console.log("from admin apr", error);
                get_next_video({file_name: file_name, assoc_category: assoc_category, appr_rej: 'approve'})
            }
        }
    })
    div.appendChild(approve_input)

    // create reject button and add and event listener to it
    let reject_input = document.createElement('input')
    reject_input.type = 'button'
    reject_input.value = 'reject'
    reject_input.className = 'nist-button btn_apr_rej'

    

    reject_input.addEventListener('click', ()=>{
        // Get project type
        let project_type_elem = document.querySelector('#project_type')
        let current_project_type = project_type_elem ? project_type_elem.innerText.trim() : project_type

        // For video_qa projects, use different logic (admin review - don't load next video)
        if (current_project_type === 'video_qa') {
            console.log('Rejecting video_qa:', file_name, assoc_category)

            // Mark video as rejected in database without loading next video
            let form_csrf_token = document.querySelector('#form-csrf-token')
            let csrf_token_element = form_csrf_token.elements[0]
            let csrf_token = csrf_token_element.value

            let formData = new FormData()
            formData.append('csrfmiddlewaretoken', csrf_token)
            formData.append('file_name', file_name)
            formData.append('cluster_keywords', assoc_category)
            formData.append('appr_rej', 'reject')

            fetch(`${base_url}/admin_approve_reject_video`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Mark the video as rejected in the sidebar
                    mark_good_bad(file_name, 'reject')
                    console.log('Video rejected successfully')
                } else {
                    console.error('Error rejecting video:', data.message)
                }
            })
            .catch(error => {
                console.error('Error rejecting video:', error)
            })
        } else {
            // Original annotation project logic
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
                console.log("from admin rej",error);
                get_next_video({file_name: file_name, assoc_category: assoc_category, appr_rej: 'reject'})
            }

            // Update job summary for annotation projects
            if (document.querySelector('#project_type')){
                handle_show_job_summary()
            }
        }
    })
    div.appendChild(reject_input)

    return div
}

function create_qa_edit_form_elem({id=null, label=null, value=null, submit=null}){
    let parentDiv = document.createElement('div')
    parentDiv.classList.add('row-align')

    // Style for grid layout
    parentDiv.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
    `


    if (submit) {
        let label_div = document.createElement('div')
        label_div.classList.add('form-label')
        let input_label = document.createElement('label')
        input_label.innerText = label+":"
        label_div.appendChild(input_label)
        parentDiv.appendChild(label_div)

        let submit_elem_div = document.createElement('div')
        submit_elem_div.className = "nist-button"

        let submit_btn = document.createElement('input')
        submit_btn.name = "submit-vid-qa"
        submit_btn.style = 'text-align: center;'
        submit_btn.type = 'submit'
        submit_btn.value = value
        submit_btn.className = "from-edit"
        submit_btn.addEventListener('click', (e)=>{
            e.preventDefault()
            let target_btn = document.querySelector('input[name="submit-vid-qa"]')
            if (target_btn.classList.contains('from-edit')){
                // don't retrive next video
                let payload = submit_video_qa_form({isEdit:true})
                // replace the old values of the the vide
                // with user provided values

            }else{
                // retrieve next video
                submit_video_qa_form()
                retrieve_next_video_qa()
            }





        })
        submit_elem_div.append(submit_btn)
        parentDiv.appendChild(submit_elem_div)
    }else{
        let id_div = document.createElement('div')
        id_div.classList.add('qa_ids')
        id_div.id = `${label}-${id}`
        parentDiv.appendChild(id_div)
        let label_div = document.createElement('div')
        label_div.classList.add('form-label')
        let input_label = document.createElement('label')
        input_label.innerText = label+":"
        label_div.appendChild(input_label)
        parentDiv.appendChild(label_div)

        let form_input_div = document.createElement('div')
        form_input_div.classList.add('form-text-input')
        let text_area = document.createElement('textarea')
        text_area.setAttribute('spellcheck', 'true');
        text_area.setAttribute('name', `${label.toLowerCase()}`);
        text_area.setAttribute('id', `${label.toLowerCase()}`);
        text_area.setAttribute('class', 'video_qa_vals')
        // Make textarea responsive and compact for grid layout
        text_area.style.cssText = `
            width: 100%;
            min-height: 80px;
            resize: vertical;
            box-sizing: border-box;
        `
        text_area.setAttribute('rows', '3');
        text_area.innerText = value
        // text_area.setAttribute('placeholder', `${value}`);
        form_input_div.appendChild(text_area)
        parentDiv.appendChild(form_input_div)
    }

    

    return parentDiv


}
let default_question = null
function create_edit_btn({file_name:file_name, cluster_keywords:cluster_keywords, project_type:project_type}){

    // Create approve/reject buttons for annotation projects only
    let app_rej_btn_div = create_apr_rej({file_name:file_name, assoc_category:cluster_keywords , caller:"appr_rej_admin"})

    let div = document.createElement('div')
    div.id = 'edit_res'

    let btn = document.createElement('input')
    btn.type = 'button'
    btn.value = 'edit response'
    btn.classList.add('nist-button')
    btn.style.cssText = 'display: block; visibility: visible; opacity: 1;'

    btn.addEventListener('click', ()=>{
        let edit_div = document.getElementById('edit_res')
        if (project_type=='video_qa'){
            let parent_div = document.querySelector('#question_tag')

            // Query within parent_div to find the Q&A elements for this specific video
            // Note: Classes use hyphens (qa-label, qa-value) not underscores
            let qa_label = parent_div.querySelectorAll('.qa-label')
            let qa_value = parent_div.querySelectorAll('.qa-value')
            let qa_ids = parent_div.querySelectorAll('.qa_ids')

            // Check if Q&A elements were found - only when entering edit mode
            if (qa_label.length === 0 && parent_div.classList.contains('qs_default')) {
                console.error('No Q&A elements found to edit')
                return
            }

            let qa_form = document.createElement('form')
            qa_form.method = "post"
            qa_form.id = "video_qs_form"

            // Add CSS Grid layout for compact 2-row display
            qa_form.style.cssText = `
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                align-items: start;
            `

            for (let i=0; i<qa_label.length; i++){
                let cur_label = qa_label[i].innerText.split(':').at(0)
                let cur_value = qa_value[i].innerText
                let cur_id = qa_ids[i].id
                let cur_form_div = create_qa_edit_form_elem({id:cur_id, label:cur_label, value:cur_value})
                qa_form.appendChild(cur_form_div)

            }
            let submit_row = create_qa_edit_form_elem({id:'submit', label:"Send QandA", value:"Submit", submit:true})
            qa_form.appendChild(submit_row)

            // retrieve the old video qs data in
            // case the user decides not to edit anymore
            if (parent_div.classList.contains('qs_default')){
                //save the current inner html
                default_question = parent_div.innerHTML
                parent_div.innerHTML = ""
                parent_div.appendChild(qa_form)

                // Change button text to "close edit"
                btn.value = "close edit"
                btn.style.backgroundColor = '#f59e0b'  // Orange color to indicate edit mode
                btn.style.color = '#ffffff'

                // remove the class list
                parent_div.classList.remove('qs_default')

            }else{
                parent_div.innerHTML = ""
                parent_div.innerHTML = default_question

                // Change button text back to "edit response"
                btn.value = "edit response"
                btn.style.backgroundColor = ''  // Reset to default
                btn.style.color = ''

                parent_div.classList.add('qs_default')
            }


        }
        else{
            // For annotation projects, toggle approve/reject buttons
            let action_control = document.querySelector('#action-control')
            let existing_apr_rej = document.getElementById('apr_rej_btn_div')
            let edit_btn_div = document.getElementById('edit_res')

            if (existing_apr_rej){
                // Hide approve/reject buttons
                existing_apr_rej.remove()
                btn.value = 'edit response'
            } else if (app_rej_btn_div) {
                // Show approve/reject buttons before the edit button (only for annotation projects)
                action_control.insertBefore(app_rej_btn_div, edit_btn_div)
                btn.value = 'close'
            }
        }


    })

    div.appendChild(btn)

    return div
}


export {base_url, get_next_video_appr_rej, create_apr_rej, create_vidname_category_spans,
     create_video_tag, prepare_quest_answer_resp, create_edit_btn, create_qa_btn_controls,
    create_video_QA_form, allow_edit_and_show_qa, add_active_to_span, show_mark_unavailable, create_youtube_iframe, mark_good_bad}