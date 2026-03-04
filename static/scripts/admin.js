var user_processed_categories = document.querySelectorAll('.user-processed-categories')
var video_categories = document.querySelectorAll('.video_categories')
var show_job_summary = document.querySelector('#show_job_summary')
var export_all_videos = document.querySelector('#export-all-videos')
var per_cluster_approve = document.querySelectorAll('.per-cluster-approve')

import {create_apr_rej, allow_edit_and_show_qa, create_vidname_category_spans,
    create_video_tag, prepare_quest_answer_resp, create_edit_btn, create_qa_btn_controls,
   create_video_QA_form, create_youtube_iframe} from './main.js'



let IsJobSummaryShowing = false
const root_url = window.location.origin
const VIDEO_TYPE_ = "video/webm"
const base_vid_src = "nist_trecvid_resources/"

// Hide Q&A section for annotation projects (only show for video_qa)
function hideQASectionForAnnotation() {
    let projectTypeElem = document.querySelector('#project_type')
    let projectType = projectTypeElem ? projectTypeElem.innerText.trim() : ''
    let qaSection = document.querySelector('.qa-section')

    if (qaSection && projectType === 'annotation') {
        qaSection.style.display = 'none'
    } else if (qaSection && projectType === 'video_qa') {
        qaSection.style.display = ''
    }
}

// Run on page load
hideQASectionForAnnotation()

function handle_export_all_videos(){
    let annotator_usernames = document.querySelectorAll('.tm-users')
    // console.log("annotator_usernames", annotator_usernames);
    let usernames_str = ""

    for (let i=0; i<annotator_usernames.length; i++){
        usernames_str += annotator_usernames[i].innerText
        if (i == annotator_usernames.length - 1){

        }else {
            usernames_str += "_"
        }
    }
    
    let endpoint = `${root_url}/export_all_videos?usernames=${usernames_str}`
    fetch(endpoint, {
        method: 'GET'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
    })
    .then((data)=> {
        if (data.error || data.status === 500) {
            let info_h3 = document.querySelectorAll('#download-jobs > .info-text')[0]
            info_h3.innerText = data.message || "No processed video found"
            let download_jobs_div = document.getElementById('download-jobs')
            if (download_jobs_div.classList.contains('display-none')) {
                download_jobs_div.classList.remove('display-none')
            }
            return
        }

        let data_finished_job_csv = data['finished_job_csv']
        let data_finished_job_videos_zip = data['zip_file_path']

        let videos_zip = document.getElementById('videos-zip')
        let csv_file = document.getElementById('csv-file')
        csv_file.innerHTML = ""
        videos_zip.innerHTML = ""

        // create anchor tag to hold link to csv and zip file
        if (data_finished_job_csv){
            let a_tag_csv = document.createElement('a')
            a_tag_csv.href = data_finished_job_csv
            a_tag_csv.innerText = "Download CSV"
            csv_file.appendChild(a_tag_csv)
            let info_h3 = document.querySelectorAll('#download-jobs > .info-text')[0]
            info_h3.innerText = "Done Exporting, click below to download files"
            let download_jobs_div = document.getElementById('download-jobs')
            if (download_jobs_div.classList.contains('display-none')) {
                download_jobs_div.classList.remove('display-none')
            }
        }
        else {
            let info_h3 = document.querySelectorAll('#download-jobs > .info-text')[0]
            info_h3.innerText = "No approved videos..."

            let download_jobs_div = document.getElementById('download-jobs')
            if (download_jobs_div.classList.contains('display-none')) {
                download_jobs_div.classList.remove('display-none')
            }
        }

        if (data_finished_job_videos_zip){
            let a_tag_zip = document.createElement('a')
            a_tag_zip.href = data_finished_job_videos_zip
            a_tag_zip.innerText = "Download compressed videos"
            videos_zip.appendChild(a_tag_zip)
        }
    })
    .catch(error => {
        console.error('Export error:', error)
        alert('An error occurred while exporting videos. Please try again.')
    })
}
// let callback = approve_all_videos
//             let kwargs = {message:message, callback:callback,endpoint:endpoint, approve_video_fetch_promise:approve_video_fetch_promise, approve_all_videos_btn:approve_all_videos_btn, inner_text:inner_text}
//             // approve_all_videos(approve_video_fetch_promise, endpoint, approve_all_videos_btn, inner_text)

// let child_node = cat_elem.childNodes
// let cur_h3 = child_node[1]
// let annotator = cur_h3.innerText.split(' - ')[1].split(' ')[0]
// console.log("!!", annotator);

// let approve_all_videos_btn = cur_h3.childNodes[1]
// let kwargs = {message:message, callback:callback, endpoint:endpoint, cat_elem:cat_elem, approve_video_fetch_promise:approve_video_fetch_promise, inner_text:inner_text}
function custom_confirm({message=null, callback=null, endpoint=null, cat_elem=null, approve_video_fetch_promise=null, inner_text=null, caller=null}){
    const confirm_overlay = document.getElementById('custom-confirm')
    confirm_overlay.style.display = 'flex' // removes the display none
    const confirm_message = document.getElementById('confirm-message')
    confirm_message.innerText = message

    const btn_yes = document.querySelector("#confirm-yes")
    const btn_cancel = document.querySelector("#confirm-cancel")

    // Clone and replace buttons to remove old event listeners (prevents accumulation)
    const newBtnYes = btn_yes.cloneNode(true)
    const newBtnCancel = btn_cancel.cloneNode(true)
    btn_yes.parentNode.replaceChild(newBtnYes, btn_yes)
    btn_cancel.parentNode.replaceChild(newBtnCancel, btn_cancel)

    if (caller){
        let child_node = cat_elem.childNodes
        let cur_h3 = child_node[1]
        let approve_all_videos_btn = cur_h3.childNodes[1]
        approve_all_videos_btn.innerText = inner_text
        let kwargs = {approve_video_fetch_promise:approve_video_fetch_promise, endpoint:endpoint, approve_all_videos_btn:approve_all_videos_btn, inner_text:inner_text, caller:caller, cat_elem:cat_elem}
        newBtnYes.addEventListener('click', ()=>{
            callback(kwargs)
            approve_all_videos_btn.innerText = inner_text
            approve_all_videos_btn.classList = "cat-approve-status-false display-none"
            confirm_overlay.style.display = 'none'
        })



    }
    else if (endpoint && !caller){
        newBtnYes.addEventListener('click', ()=>{
            // handle per cluster rejection

            if (cat_elem.innerText.toLowerCase() == "approved"){
                // reject a cluster
                confirm_message.innerText = "Do you want to cancel approval?"
                confirm_overlay.style.display = 'none'
                endpoint = endpoint + "&status=rejected"

                callback(endpoint)
                cat_elem.classList.remove('cat-approve-status-true')
                cat_elem.classList.add("cat-approve-status-false")
                cat_elem.innerText = "approve cluster"
            }else{
                endpoint = endpoint + "&status=approved"
                callback(endpoint)
                cat_elem.classList.remove('cat-approve-status-false')
                cat_elem.classList.add("cat-approve-status-true")
                cat_elem.innerText = "approved"
            }


        })
    } else {
        // Simple confirm: just message and callback, wait for user to click Yes
        newBtnYes.addEventListener('click', () => {
            confirm_overlay.style.display = 'none'
            if (callback) {
                callback()
            }
        })
    }


    newBtnCancel.addEventListener('click', ()=>{
        confirm_overlay.style.display = 'none'
    })
}

if(export_all_videos){
    export_all_videos.addEventListener('click', ()=>{
        if (user_processed_categories.length === 0) {
            alert('No processed videos found.')
            return
        }

        let message = "Are you sure you want to export processed videos?"
        let callback = handle_export_all_videos
        custom_confirm({message: message, callback: callback})

    })
}

// Delete All Videos functionality
var delete_all_videos_btn = document.querySelector('#delete-all-videos')

function handle_delete_all_videos() {
    // Perform the actual deletion
    let endpoint = `${root_url}/delete_all_videos?confirm=true`

    fetch(endpoint, {
        method: 'GET'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || `HTTP error! status: ${response.status}`)
            })
        }
        return response.json()
    })
    .then((data) => {
        if (data.success) {
            alert(`Successfully deleted ${data.deleted_videos} videos and ${data.deleted_categories} categories. The page will now reload.`)
            // Reload the page to reflect changes
            window.location.reload()
        } else {
            alert(data.error || 'An error occurred while deleting videos.')
        }
    })
    .catch(error => {
        console.error('Delete error:', error)
        alert(`Error: ${error.message}`)
    })
}

if (delete_all_videos_btn) {
    delete_all_videos_btn.addEventListener('click', () => {
        // First, check if there are ongoing annotation jobs
        let checkEndpoint = `${root_url}/check_ongoing_jobs`

        fetch(checkEndpoint, {
            method: 'GET'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || `HTTP error! status: ${response.status}`)
                })
            }
            return response.json()
        })
        .then((data) => {
            if (data.total_videos === 0) {
                alert('There are no videos to delete.')
                return
            }

            let warningMessage = ''

            if (data.has_ongoing_jobs) {
                // Build warning message
                warningMessage = `⚠️ WARNING: This action cannot be undone!\n\n`
                warningMessage += `Project: ${data.project_name}\n`
                warningMessage += `Total videos to delete: ${data.total_videos}\n`
                warningMessage += `Videos already processed: ${data.processed_videos}\n`

                if (data.active_annotators && data.active_annotators.length > 0) {
                    warningMessage += `\nActive annotators (${data.active_annotators.length}): ${data.active_annotators.join(', ')}\n`
                    warningMessage += `\n🚨 Some users are already working on this project. Deleting will clear ALL their progress!`
                }

                warningMessage += `\n\nAre you absolutely sure you want to delete all videos?`
            } else {
                warningMessage = `⚠️ WARNING: This action cannot be undone!\n\n`
                warningMessage += `Project: ${data.project_name}\n`
                warningMessage += `Total videos to delete: ${data.total_videos}\n\n`
                warningMessage += `Are you sure you want to delete all videos?`
            }

            // Use custom_confirm for consistency with other actions
            custom_confirm({
                message: warningMessage,
                callback: handle_delete_all_videos
            })
        })
        .catch(error => {
            console.error('Check ongoing jobs error:', error)
            alert(`Error: ${error.message}`)
        })
    })
}


function set_default_th(thead){
    let default_tr_elem = document.createElement('tr')

    let th_elem1 = document.createElement('th')
    th_elem1.innerText = "Annotator"
    default_tr_elem.appendChild(th_elem1)

    let th_elem2 = document.createElement('th')
    th_elem2.innerText = "Top Category (TC)"
    default_tr_elem.appendChild(th_elem2)

    let th_elem3 = document.createElement('th')
    th_elem3.innerText = "Number of Video in TC"
    default_tr_elem.appendChild(th_elem3)

    let th_elem4 = document.createElement('th')
    th_elem4.innerText = "Total Accepted Videos"
    default_tr_elem.appendChild(th_elem4)
    thead.appendChild(default_tr_elem)
}

function populate_and_show_annotation_stats(data, autoShow = true){
    let annotation_stats = document.querySelector('#annotation-stats')
    let thead = document.getElementById('admin-thead')
    let tbody = document.getElementById('admin-tbody')
    tbody.innerHTML = ""
    if (thead.innerHTML == ""){
        set_default_th(thead)
    }

    // Populate the table with data
    data.forEach((item)=>{
        let tr_elem = document.createElement('tr')
        for (const [key, value] of Object.entries(item)){
            let td_elem = document.createElement('td')
            if (key == "user"){
                td_elem.classList.add("tm-users")
            }
            td_elem.innerText = value
            tr_elem.appendChild(td_elem)
        }
        tbody.appendChild(tr_elem)
    })

    // Auto-show the job summary panel after approve/reject actions
    if (autoShow && !annotation_stats.classList.contains('panel-open')) {
        annotation_stats.classList.add('panel-open')
        annotation_stats.classList.remove('display-none')
        IsJobSummaryShowing = true
        if (show_job_summary) {
            show_job_summary.setAttribute('aria-expanded', 'true')
            let arrowIcon = show_job_summary.querySelector('.toggle-btn-arrow .material-icons')
            if (arrowIcon) arrowIcon.textContent = 'expand_less'
            let subtitle = show_job_summary.querySelector('.toggle-btn-subtitle')
            if (subtitle) subtitle.textContent = 'Click to hide statistics'
        }
    }
}
    
function handle_show_job_summary(){
    let annotation_stats = document.querySelector('#annotation-stats')

    if (!IsJobSummaryShowing){
        // Show the job summary panel with animation
        annotation_stats.classList.add('panel-open')
        annotation_stats.classList.remove('display-none')
        IsJobSummaryShowing = true

        // Update toggle button state
        show_job_summary.setAttribute('aria-expanded', 'true')
        let arrowIcon = show_job_summary.querySelector('.toggle-btn-arrow .material-icons')
        if (arrowIcon) arrowIcon.textContent = 'expand_less'
        let subtitle = show_job_summary.querySelector('.toggle-btn-subtitle')
        if (subtitle) subtitle.textContent = 'Click to hide statistics'

        // Add loading state while fetching
        show_job_summary.classList.add('loading')

        // Only fetch data when showing the panel
        // Get username from the user-name span in the navbar
        let usernameElem = document.querySelector('.user-name')
        let username = usernameElem ? usernameElem.innerText.trim() : null

        if (!username) {
            console.error('Could not find username element')
            alert('Error: Could not determine admin username')
            show_job_summary.classList.remove('loading')
            return
        }

        console.log('Fetching job summary for admin:', username)
        let endpoint = `${root_url}/get_job_summary?admin_username=${username}`

        fetch(endpoint, {
            method: "GET"
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            return response.json()
        })
        .then((data)=>{
            show_job_summary.classList.remove('loading')
            if (data.error) {
                console.error('Server error:', data.error)
                alert(`Error loading job summary: ${data.error}`)
                return
            }
            populate_and_show_annotation_stats(data)
        })
        .catch(error => {
            show_job_summary.classList.remove('loading')
            console.error('Fetch error:', error)
            alert('An error occurred while loading job summary. Please try again.')
        })
    }
    else {
        // Hide the job summary panel with animation
        annotation_stats.classList.remove('panel-open')
        IsJobSummaryShowing = false

        // Update toggle button state
        show_job_summary.setAttribute('aria-expanded', 'false')
        let arrowIcon = show_job_summary.querySelector('.toggle-btn-arrow .material-icons')
        if (arrowIcon) arrowIcon.textContent = 'expand_more'
        let subtitle = show_job_summary.querySelector('.toggle-btn-subtitle')
        if (subtitle) subtitle.textContent = 'View annotation statistics'
    }
}

if (show_job_summary){
    show_job_summary.addEventListener('click', ()=>{
        handle_show_job_summary()

    })
}

// Annotators Panel Functionality
let IsAnnotatorsPanelShowing = false
let show_annotators = document.querySelector('#show_annotators')
let annotators_panel = document.querySelector('#annotators-panel')

function populate_annotators_table(data) {
    let tbody = document.querySelector('#annotators-tbody')
    let totalCountElem = document.querySelector('#total-annotators-count')
    let activeCountElem = document.querySelector('#active-annotators-count')
    let finishedCountElem = document.querySelector('#finished-annotators-count')
    let noAnnotatorsMsg = document.querySelector('#no-annotators-message')

    if (!tbody) return

    // Update summary counts
    if (totalCountElem) totalCountElem.textContent = data.total_count || 0
    if (activeCountElem) activeCountElem.textContent = data.active_count || 0
    if (finishedCountElem) finishedCountElem.textContent = data.finished_count || 0

    // Clear existing rows
    tbody.innerHTML = ''

    if (!data.annotators || data.annotators.length === 0) {
        // Show empty state
        if (noAnnotatorsMsg) {
            noAnnotatorsMsg.classList.remove('display-none')
        }
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="6" class="empty-cell">No annotators assigned to this project</td>
            </tr>
        `
        return
    }

    // Hide empty state message
    if (noAnnotatorsMsg) {
        noAnnotatorsMsg.classList.add('display-none')
    }

    // Populate table with annotator data
    data.annotators.forEach((annotator) => {
        let tr = document.createElement('tr')

        // Status badge class
        let statusClass = 'status-pending'
        let statusIcon = 'schedule'
        if (annotator.status === 'completed') {
            statusClass = 'status-completed'
            statusIcon = 'check_circle'
        } else if (annotator.status === 'active') {
            statusClass = 'status-active'
            statusIcon = 'play_circle'
        }

        tr.innerHTML = `
            <td class="annotator-username">
                <span class="material-icons">person</span>
                ${annotator.username}
            </td>
            <td class="annotator-email">${annotator.email}</td>
            <td class="annotator-group">${annotator.group}</td>
            <td class="annotator-status">
                <span class="status-badge ${statusClass}">
                    <span class="material-icons">${statusIcon}</span>
                    ${annotator.status}
                </span>
            </td>
            <td class="annotator-progress">
                <div class="progress-wrapper">
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${annotator.progress_percent}%"></div>
                    </div>
                    <span class="progress-text">${annotator.progress}</span>
                </div>
            </td>
            <td class="annotator-actions">
                <button class="annotator-delete-btn" data-username="${annotator.username}" title="Remove annotator">
                    <span class="material-icons">delete</span>
                </button>
            </td>
        `

        // Add delete button event listener
        let deleteBtn = tr.querySelector('.annotator-delete-btn')
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                handle_delete_annotator(annotator.username)
            })
        }

        tbody.appendChild(tr)
    })
}

// Handle delete annotator with confirmation
function handle_delete_annotator(username) {
    let message = `⚠️ Are you sure you want to delete "${username}"?\n\nThis will:\n• Permanently delete the user account\n• Remove them from this project\n• Reset all videos they processed back to unprocessed status\n\nThis action cannot be undone.`

    custom_confirm({
        message: message,
        callback: () => {
            // Perform the delete request
            let endpoint = `${root_url}/delete_annotator?username=${encodeURIComponent(username)}&confirm=true`

            fetch(endpoint, {
                method: 'GET'
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || `HTTP error! status: ${response.status}`)
                    })
                }
                return response.json()
            })
            .then((data) => {
                if (data.success) {
                    alert(`Successfully deleted user "${username}".`)
                    // Refresh the annotators table
                    refresh_annotators_table()
                } else {
                    alert(data.error || 'An error occurred while deleting the annotator.')
                }
            })
            .catch(error => {
                console.error('Delete annotator error:', error)
                alert(`Error: ${error.message}`)
            })
        }
    })
}

// Refresh annotators table data
function refresh_annotators_table() {
    let endpoint = `${root_url}/list_annotators`

    fetch(endpoint, {
        method: 'GET'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
    })
    .then((data) => {
        if (data.error) {
            console.error('Server error:', data.error)
            return
        }
        populate_annotators_table(data)
    })
    .catch(error => {
        console.error('Refresh annotators error:', error)
    })
}

function handle_show_annotators() {
    if (!annotators_panel) return

    if (!IsAnnotatorsPanelShowing) {
        // Show the annotators panel with animation
        annotators_panel.classList.add('panel-open')
        annotators_panel.classList.remove('display-none')
        IsAnnotatorsPanelShowing = true

        // Update toggle button state
        if (show_annotators) {
            show_annotators.setAttribute('aria-expanded', 'true')
            let arrowIcon = show_annotators.querySelector('.toggle-btn-arrow .material-icons')
            if (arrowIcon) arrowIcon.textContent = 'expand_less'
            let subtitle = show_annotators.querySelector('.toggle-btn-subtitle')
            if (subtitle) subtitle.textContent = 'Click to hide annotators'
        }

        // Add loading state
        if (show_annotators) show_annotators.classList.add('loading')

        // Fetch annotators data
        let endpoint = `${root_url}/list_annotators`

        fetch(endpoint, {
            method: 'GET'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            return response.json()
        })
        .then((data) => {
            if (show_annotators) show_annotators.classList.remove('loading')
            if (data.error) {
                console.error('Server error:', data.error)
                alert(`Error loading annotators: ${data.error}`)
                return
            }
            populate_annotators_table(data)
        })
        .catch(error => {
            if (show_annotators) show_annotators.classList.remove('loading')
            console.error('Fetch error:', error)
            alert('An error occurred while loading annotators. Please try again.')
        })
    } else {
        // Hide the annotators panel
        annotators_panel.classList.remove('panel-open')
        IsAnnotatorsPanelShowing = false

        // Update toggle button state
        if (show_annotators) {
            show_annotators.setAttribute('aria-expanded', 'false')
            let arrowIcon = show_annotators.querySelector('.toggle-btn-arrow .material-icons')
            if (arrowIcon) arrowIcon.textContent = 'expand_more'
            let subtitle = show_annotators.querySelector('.toggle-btn-subtitle')
            if (subtitle) subtitle.textContent = 'View assigned annotators'
        }
    }
}

if (show_annotators) {
    show_annotators.addEventListener('click', () => {
        handle_show_annotators()
    })
}

// Close button for annotators panel
let annotators_panel_close = document.querySelector('#annotators-panel .panel-close-btn')
if (annotators_panel_close) {
    annotators_panel_close.addEventListener('click', () => {
        if (annotators_panel) {
            annotators_panel.classList.remove('panel-open')
            IsAnnotatorsPanelShowing = false

            if (show_annotators) {
                show_annotators.setAttribute('aria-expanded', 'false')
                let arrowIcon = show_annotators.querySelector('.toggle-btn-arrow .material-icons')
                if (arrowIcon) arrowIcon.textContent = 'expand_more'
                let subtitle = show_annotators.querySelector('.toggle-btn-subtitle')
                if (subtitle) subtitle.textContent = 'View assigned annotators'
            }
        }
    })
}


function approve_single_cluster(endpoint){
    return fetch(endpoint, {
        method: "GET"
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
    })
    .then((data)=>{
        if (data.error) {
            console.error('Server error:', data.error)
            alert(`Error: ${data.error}`)
            return null
        }
        populate_and_show_annotation_stats(data)
        return data
    })
    .catch(error => {
        console.error('Fetch error:', error)
        alert('An error occurred while processing your request. Please try again.')
        return null
    })
}

// approve cluster = approve

// approved = reject

per_cluster_approve.forEach((cat_elem)=>{
    cat_elem.addEventListener("click", ()=>{
        let project_type_elem = document.querySelector('#project_type')
        let project_type = project_type_elem ? project_type_elem.innerText.trim() : 'annotation'

        // Get text content, checking for approve/reject keywords
        let cat_elem_text = cat_elem.innerText.toLowerCase()
        let cur_elem_parent = cat_elem.parentNode

        // Get cluster keyword from the category span
        let categorySpan = cur_elem_parent.querySelector('.user-processed-categories')
        let categoryText = categorySpan ? categorySpan.innerText.trim() : cur_elem_parent.innerText.trim()
        // Remove "folder" icon text and get just the category keyword (before any parentheses)
        let cluster_keyword = categoryText.replace(/^folder\s*/i, '').split('(')[0].trim()

        // URL encode the cluster keyword to handle special characters
        let encodedClusterKeyword = encodeURIComponent(cluster_keyword)
        let endpoint = `${root_url}/admin_approve?cluster_keyword=${encodedClusterKeyword}&project_type=${project_type}`

        // Helper function to update single category UI
        function updateCategoryUI(approved) {
            if (approved) {
                cat_elem.innerHTML = '<span class="material-icons">check_circle</span> reject'
                cat_elem.classList.remove('cat-approve-status-false')
                cat_elem.classList.add("cat-approve-status-true")
            } else {
                cat_elem.innerHTML = '<span class="material-icons">pending</span> approve'
                cat_elem.classList.remove('cat-approve-status-true')
                cat_elem.classList.add("cat-approve-status-false")
            }
        }

        // Check if current state is "approve" (pending) or "reject" (approved)
        if (cat_elem_text.includes("approve") && !cat_elem_text.includes("reject")){
            endpoint = endpoint + "&status=approved"
            approve_single_cluster(endpoint).then((result) => {
                if (result) {
                    // Update UI only after successful response
                    updateCategoryUI(true)
                }
            })

        } else if(cat_elem_text.includes("reject")){
            endpoint = endpoint + "&status=rejected"
            approve_single_cluster(endpoint).then((result) => {
                if (result) {
                    // Update UI only after successful response
                    updateCategoryUI(false)
                }
            })
        }

    })
})

function prepare_full_load_admin(annotator, category_list_ul){
    let user_categories_list = category_list_ul.querySelectorAll('li')
    let li_array = Array.from(user_categories_list)

    let set_of_categories = new Set()
    li_array.forEach((li_ele)=>{
        // Get the category span and extract text, removing icon text
        let categorySpan = li_ele.querySelector('.user-processed-categories')
        let categoryText = categorySpan ? categorySpan.innerText.trim() : li_ele.innerText.trim()
        // Remove "folder" icon text and get just the category keyword (before any parentheses)
        let category_text_value = categoryText.replace(/^folder\s*/i, '').split('(')[0].trim()
        if (category_text_value) {
            set_of_categories.add(category_text_value)
        }
    })
    let set_of_categories_array = Array.from(set_of_categories) // convert the set to an array
    let set_of_categories_array_str = set_of_categories_array.join('|||') // use ||| delimiter to avoid conflicts with hyphens in category names
    let full_load = annotator+"|||"+set_of_categories_array_str // send the annotator alongside the category list payload
    return encodeURIComponent(full_load)
}

function admin_reject_all_videos({cat_elem=null}){
    let h3 = cat_elem.firstElementChild
    let username = h3.innerText.split('-').at(-1).trim().split(' ')[0]
    let appr_rej = h3.querySelector('span').innerText
    if (appr_rej=='Approved'){
        let reject_approve_all = true
        console.log("Do you want to reject all in func");
        
    }   
}

function replace_category_appr_rej(text_to_replace, assoc_class, cat_elem){
    let per_cluster_approve = cat_elem.querySelectorAll('.per-cluster-approve')
    per_cluster_approve.forEach((cluster_span)=>{
        cluster_span.innerText = text_to_replace
        cluster_span.classList = assoc_class
        
    })

}

// {endpoint:endpoint, category_list_ul:category_list_ul}
function approve_all_videos({endpoint=endpoint, category_list_ul=category_list_ul}){

    let all_cluster_keyword_li = category_list_ul.querySelectorAll('li')
    let isApproval = endpoint.includes('approved')

    // Helper function to update UI for all categories
    function updateAllCategoriesUI(approved) {
        all_cluster_keyword_li.forEach((li)=>{
            let cluster_keyword_span = li.querySelector('.per-cluster-approve')
            if (cluster_keyword_span) {
                if (approved) {
                    cluster_keyword_span.innerHTML = '<span class="material-icons">check_circle</span> reject'
                    cluster_keyword_span.classList.remove('cat-approve-status-false')
                    cluster_keyword_span.classList.add('cat-approve-status-true')
                } else {
                    cluster_keyword_span.innerHTML = '<span class="material-icons">pending</span> approve'
                    cluster_keyword_span.classList.remove('cat-approve-status-true')
                    cluster_keyword_span.classList.add('cat-approve-status-false')
                }
            }
        })
    }

    // Perform fetch first, then update UI on success
    return fetch(endpoint, {
        method: 'GET'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
    })
    .then((data)=>{
        if (data.error) {
            console.error('Server error:', data.error)
            alert(`Error: ${data.error}`)
            return null
        }
        // Update UI only after successful response
        updateAllCategoriesUI(isApproval)
        populate_and_show_annotation_stats(data)
        return data
    })
    .catch(error => {
        console.error('Fetch error:', error)
        alert('An error occurred while processing your request. Please try again.')
        return null
    })
}

video_categories.forEach((cat_elem)=>{
    // handle approve or reject all videos
    let annotation_stats = document.querySelector('#annotation-stats')
    let h3 = cat_elem.querySelector('h3')
    let process_all_videos_div = cat_elem.querySelector('.process_all_videos')
    let approve_all_videos_btn = process_all_videos_div.querySelector('#approve_all_videos')
    let reject_all_videos_btn = process_all_videos_div.querySelector('#reject_all_videos')
    
    
    approve_all_videos_btn.addEventListener('click', ()=>{
        let vid_categories = approve_all_videos_btn.parentElement.parentElement
        // Try to get annotator from specific span first
        let annotatorNameSpan = vid_categories.querySelector('.annotator-name-text')
        let annotator = ''
        if (annotatorNameSpan) {
            let nameText = annotatorNameSpan.innerText.trim()
            if (nameText.includes(' - ')) {
                annotator = nameText.split(' - ')[1].trim()
            }
        } else {
            let h3Text = vid_categories.querySelector('h3').innerText.replace(/[\n\r]+/g, ' ')
            let parts = h3Text.split('-')
            annotator = parts.length > 1 ? parts[parts.length - 1].trim().split(/\s+/)[0] : ''
        }
        let category_list_ul = vid_categories.querySelector('ul')
        let full_load = prepare_full_load_admin(annotator, category_list_ul)
        let status = "approved"
        let endpoint = `${root_url}/admin_approve?user_categories=${full_load}&status=${status}`
        let kwargs = {endpoint:endpoint, category_list_ul:category_list_ul}
        approve_all_videos(kwargs)
    })

    reject_all_videos_btn.addEventListener('click', ()=>{
        let vid_categories = approve_all_videos_btn.parentElement.parentElement
        // Try to get annotator from specific span first
        let annotatorNameSpan = vid_categories.querySelector('.annotator-name-text')
        let annotator = ''
        if (annotatorNameSpan) {
            let nameText = annotatorNameSpan.innerText.trim()
            if (nameText.includes(' - ')) {
                annotator = nameText.split(' - ')[1].trim()
            }
        } else {
            let h3Text = vid_categories.querySelector('h3').innerText.replace(/[\n\r]+/g, ' ')
            let parts = h3Text.split('-')
            annotator = parts.length > 1 ? parts[parts.length - 1].trim().split(/\s+/)[0] : ''
        }
        let category_list_ul = vid_categories.querySelector('ul')
        let full_load = prepare_full_load_admin(annotator, category_list_ul)
        let status = "rejected"
        let endpoint = `${root_url}/admin_approve?user_categories=${full_load}&status=${status}`
        let kwargs = {endpoint:endpoint, category_list_ul:category_list_ul}
        approve_all_videos(kwargs)
        // populate_and_show_annotation_stats(annotation_stats)
        // console.log("full_load", full_load);
    })
    
    
    let h3_span = h3.querySelector('span')
    let approve_video_fetch_promise = null
    
    cat_elem.addEventListener('mouseover', (e)=>{ 
        
        process_all_videos_div.classList.remove('display-none')
       

    })

    cat_elem.addEventListener('mouseout', (e)=>{
        process_all_videos_div.classList.add('display-none')
        
        
    })
    
})


function create_video_element(){
    let video = document.createElement('video')
    video.width = 600
    video.height = 500
    video.setAttribute("controls", "controls")
    video.type = VIDEO_TYPE_

    return video
}

function preview_video_admin({file_name=null, cluster_keywords=null, video_url=null, youtube_vid_id=null,
                                checked_by=null, question_tag=null, project_type=null, annotator=null}){

    const[span_heading, br_elem, span_category] = create_vidname_category_spans(cluster_keywords)
    let vid_tag = document.getElementById('vid_tag')
    let video_name = document.querySelector('#video_name')
    let video_keywords = document.querySelector('#video_keywords')

    // Clear previous content
    video_name.innerHTML = ""
    vid_tag.innerHTML = ""

    // Append hidden spans so submit_video_qa_form can find video_name_value and cluster_keyword
    let existing_vnv = document.querySelector('#video_name_value')
    if (existing_vnv) existing_vnv.remove()
    let existing_ck = document.querySelector('#cluster_keyword')
    if (existing_ck) existing_ck.remove()
    span_heading.textContent = file_name
    span_heading.style.display = 'none'
    span_category.style.display = 'none'
    vid_tag.parentElement.appendChild(span_heading)
    vid_tag.parentElement.appendChild(span_category)

    // Update video title
    video_name.textContent = file_name
    video_name.title = file_name // Full name on hover

    // Update keywords badge
    if (video_keywords) {
        video_keywords.innerHTML = `<span class="material-icons" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">label</span>${cluster_keywords}`
    }

    // Hide placeholder
    let placeholder = vid_tag.querySelector('.video-placeholder')
    if (placeholder) {
        placeholder.remove()
    }

    // Prioritize YouTube videos if youtube_vid_id exists
    if (youtube_vid_id && youtube_vid_id !== 'null' && youtube_vid_id !== 'None') {
        let iframe = create_youtube_iframe(youtube_vid_id)
        iframe.style.borderRadius = '12px'
        vid_tag.appendChild(iframe)
    }
    else if (video_url && video_url !== 'None' && video_url !== 'null' && video_url !== '') {
        const video = create_video_tag()
        let source = video_url + '/' + `${file_name}`
        video.src = base_vid_src + source
        video.style.borderRadius = '12px'
        video.style.maxWidth = '100%'
        vid_tag.appendChild(video)
    }
    else {
        console.warn('No valid video source found for:', file_name)
        // Show placeholder message for missing video
        let noVideoMsg = document.createElement('div')
        noVideoMsg.className = 'video-placeholder'
        noVideoMsg.innerHTML = `
            <span class="material-icons placeholder-icon">videocam_off</span>
            <p>Video file not available</p>
        `
        vid_tag.appendChild(noVideoMsg)
    }

    // Show Q&A section if video was reviewed (only for video_qa projects)
    if (checked_by){
        var question_tag_elem = document.querySelector('#question_tag')
        if (question_tag_elem) {
            question_tag_elem.innerHTML = '' // Clear previous Q&A
        }
        allow_edit_and_show_qa({checked_by:checked_by, project_type:project_type,
            file_name:file_name, cluster_keywords:cluster_keywords, question_tag:question_tag_elem, annotator:annotator})
    } else {
        // Show pending notice if not reviewed (only for video_qa projects)
        let question_tag_elem = document.querySelector('#question_tag')
        if (question_tag_elem) {
            question_tag_elem.innerHTML = `
                <div class="qa-pending-notice">
                    <span class="material-icons" style="color: #6b7280; margin-right: 8px;">info_outline</span>
                    <span style="color: #6b7280;">This video has not been reviewed yet.</span>
                </div>
            `
        }
    }

    // Hide Q&A section for annotation projects
    hideQASectionForAnnotation()
}

function remove_active_marks(parent_elem){
    let child_nodes = parent_elem.childNodes

    child_nodes.forEach((node)=>{
        node.classList.remove('active')
    })

}
function create_ul_elements_with_videos({data=null, cluster_keywords=null, project_type=null, annotator=null}){
    // Get or create the video list container
    let video_list_container = document.querySelector('#video-list-container')
    let ul_elem = document.getElementById('admin_video_ul')
    let video_list_admin = document.querySelector('#video_list_admin')

    // Clear video placeholder if exists
    let placeholder = document.querySelector('.video-placeholder')
    if (placeholder) {
        placeholder.style.display = 'none'
    }

    if (ul_elem == null) {
        ul_elem = document.createElement('ul')
        ul_elem.id = 'admin_video_ul'
    } else {
        ul_elem.innerHTML = ""
    }

    let count = 0
    let videoDataArray = [] // Store video data for search filtering

    for (const [key, value] of Object.entries(data)){
        let file_name = value['fields']['file_name']
        let is_available = value['fields']['is_available']
        let keywords = value['fields']['keywords']
        let youtube_vid_id = value['fields']['youtube_vid_id']
        let video_url = value['fields']['video_path']
        let checked_by = value['fields']['checked_by']

        // Store video data for filtering
        videoDataArray.push({
            file_name, is_available, keywords, youtube_vid_id, video_url, checked_by
        })

        let li_elem = document.createElement('li')
        li_elem.id = `${file_name}`
        li_elem.className = 'video-list-item'
        li_elem.setAttribute('data-filename', file_name.toLowerCase())

        // Create video icon container
        let iconContainer = document.createElement('div')
        iconContainer.className = 'video-item-icon'
        let videoIcon = document.createElement('span')
        videoIcon.className = 'material-icons'
        videoIcon.textContent = youtube_vid_id && youtube_vid_id !== 'null' && youtube_vid_id !== 'None' ? 'youtube_searched_for' : 'smart_display'
        iconContainer.appendChild(videoIcon)
        li_elem.appendChild(iconContainer)

        // Create info container
        let infoContainer = document.createElement('div')
        infoContainer.className = 'video-item-info'

        let fileNameSpan = document.createElement('span')
        fileNameSpan.className = 'video-item-name'
        fileNameSpan.textContent = file_name
        fileNameSpan.title = file_name // Show full name on hover
        infoContainer.appendChild(fileNameSpan)

        // Add status indicator
        let statusSpan = document.createElement('span')
        statusSpan.className = 'video-item-status'
        if (checked_by) {
            statusSpan.innerHTML = `<span class="material-icons">check_circle</span> Reviewed`
        } else {
            statusSpan.innerHTML = `<span class="material-icons">schedule</span> Pending`
        }
        infoContainer.appendChild(statusSpan)

        li_elem.appendChild(infoContainer)

        // Add arrow indicator
        let arrowIcon = document.createElement('span')
        arrowIcon.className = 'material-icons video-item-arrow'
        arrowIcon.textContent = 'chevron_right'
        li_elem.appendChild(arrowIcon)

        let target_elem = li_elem
        if (count == 0){
            // Display the first video once a category is clicked
            target_elem = li_elem
            remove_active_marks(ul_elem)

            preview_video_admin({file_name:file_name, cluster_keywords:cluster_keywords, video_url:video_url, youtube_vid_id:youtube_vid_id,
                checked_by:checked_by, question_tag:question_tag, project_type:project_type, annotator:annotator})
            target_elem.classList.add('active')
        }

        li_elem.addEventListener('click', (e) => {
            remove_active_marks(ul_elem)
            preview_video_admin({file_name:file_name, cluster_keywords:cluster_keywords, video_url:video_url, youtube_vid_id:youtube_vid_id,
                checked_by:checked_by, question_tag:question_tag, project_type:project_type, annotator:annotator})

            // Find the li element (in case click was on child)
            let clickedLi = e.target.closest('li')
            if (clickedLi) {
                clickedLi.classList.add('active')
            }
        })

        ul_elem.appendChild(li_elem)
        count = count + 1
    }

    // Update video count display
    let videoCountDisplay = document.querySelector('#video-list-count')
    if (videoCountDisplay) {
        videoCountDisplay.textContent = `${count} video${count !== 1 ? 's' : ''}`
    }

    // Also update legacy count if exists
    let video_list_header = video_list_admin.querySelector('h2')
    if (video_list_header) {
        let existingCount = video_list_header.querySelector('.video-count')
        if (existingCount) {
            existingCount.textContent = `${count} videos`
        }
    }

    // Append to the container
    if (video_list_container) {
        video_list_container.innerHTML = ''
        video_list_container.appendChild(ul_elem)
    } else {
        video_list_admin.appendChild(ul_elem)
    }

    // Setup search functionality
    setupVideoSearch(ul_elem)

    return ul_elem
}

// Video search/filter functionality
function setupVideoSearch(ul_elem) {
    let searchInput = document.querySelector('#video-search-input')
    if (!searchInput) return

    // Remove existing listener by cloning
    let newSearchInput = searchInput.cloneNode(true)
    searchInput.parentNode.replaceChild(newSearchInput, searchInput)

    newSearchInput.addEventListener('input', (e) => {
        let searchTerm = e.target.value.toLowerCase().trim()
        let videoItems = ul_elem.querySelectorAll('li')
        let visibleCount = 0

        videoItems.forEach((item) => {
            let filename = item.getAttribute('data-filename') || item.textContent.toLowerCase()
            if (filename.includes(searchTerm)) {
                item.style.display = ''
                visibleCount++
            } else {
                item.style.display = 'none'
            }
        })

        // Update count to show filtered results
        let videoCountDisplay = document.querySelector('#video-list-count')
        if (videoCountDisplay) {
            let totalCount = videoItems.length
            if (searchTerm) {
                videoCountDisplay.textContent = `${visibleCount} of ${totalCount} videos`
            } else {
                videoCountDisplay.textContent = `${totalCount} video${totalCount !== 1 ? 's' : ''}`
            }
        }
    })
}

user_processed_categories.forEach((category)=>{
    let project_type = document.querySelector('#project_type').innerText.trim()
    category.addEventListener('click', (e) => {
        // let admin_video_preview = document.querySelector('#admin-video-preview')
        //     admin_video_preview.innerHTML = ""

        // Extract category text, excluding the material icon text
        let categoryText = category.innerText.trim()
        // Remove "folder" icon text if present and get just the category keyword
        let cluster_keywords = categoryText.replace(/^folder\s*/i, '').split('(')[0].trim()

        // Remove active from all category items
        let allCategoryItems = document.querySelectorAll('.category-item')
        allCategoryItems.forEach((item)=> {
            item.classList.remove('active')
        })

        // Add active to the parent li.category-item
        let categoryItem = category.closest('.category-item') || category.parentElement
        if (categoryItem) {
            categoryItem.classList.add('active')
        }

        // Show the video inspection panel with the category name
        showVideoInspectionPanel(cluster_keywords)
        
        // select h3 element that holds the annotator's name
        let annotatorCard = category.closest('.video_categories') || category.closest('.annotator-card')

        // Try to get annotator from the specific span first (new format)
        let annotatorNameSpan = annotatorCard ? annotatorCard.querySelector('.annotator-name-text') : null
        let annotator = ''

        if (annotatorNameSpan) {
            // New format: span contains "Video Categories - username"
            let nameText = annotatorNameSpan.innerText.trim()
            if (nameText.includes(' - ')) {
                annotator = nameText.split(' - ')[1].trim()
            }
        } else {
            // Fallback to old h3 parsing - clean up newlines
            let h3_elem = annotatorCard ? annotatorCard.querySelector('h3') : null
            let h3_elem_text = h3_elem ? h3_elem.innerText.replace(/[\n\r]+/g, ' ').trim() : ''
            if (h3_elem_text.includes(' - ')) {
                let parts = h3_elem_text.split(' - ')
                annotator = parts[1].trim().split(/\s+/)[0]
            }
        }
        
        let isAdmin = null
        let admin_project_type_span = document.getElementById('project_type')

        // URL encode parameters to handle special characters
        let encodedCategory = encodeURIComponent(cluster_keywords)
        let encodedAnnotator = encodeURIComponent(annotator)
        let encodedProjectType = encodeURIComponent(project_type)

        if (admin_project_type_span){
            isAdmin = true
            var get_category_endpoint = `${root_url}/display_videos?category=${encodedCategory}&annotator=${encodedAnnotator}&project_type=${encodedProjectType}&is_admin=${isAdmin}`
        }else{
            var get_category_endpoint = `${root_url}/display_videos?category=${encodedCategory}&annotator=${encodedAnnotator}&project_type=${encodedProjectType}`
        }

        console.log('Fetching videos:', { category: cluster_keywords, annotator: annotator, endpoint: get_category_endpoint })
    
        
        
        fetch(get_category_endpoint, {
            method: 'GET'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            return response.json()
        })
        .then((data)=>{
            if (data.error) {
                console.error('Server error:', data.error)
                alert(`Error loading videos: ${data.error}`)
                return
            }

            let video_list_admin = document.querySelector('#video_list_admin')

            let ul_elem = create_ul_elements_with_videos({data:data, cluster_keywords:cluster_keywords, project_type:project_type, annotator:annotator})
            video_list_admin.appendChild(ul_elem)
        })
        .catch(error => {
            console.error('Fetch error:', error)
            alert('An error occurred while loading videos. Please try again.')
        })
    })
})

function show_json_txt_dir_input(){
    let yt_file_type_select = document.querySelector('#yt_file_type_select')
    if (!yt_file_type_select) return // Guard clause if element doesn't exist

    yt_file_type_select.addEventListener('change', (e)=>{
        let selected = e.target.value
        let json_dir_input = document.querySelector('#json_dir_input')
        let txt_dir_input = document.querySelector('#txt_dir_input')

        if (selected == 'json'){
            if (json_dir_input) json_dir_input.classList.toggle('display-none', false);
            if (txt_dir_input) txt_dir_input.classList.toggle('display-none', true);
        }
        else if (selected == 'text'){
            if (txt_dir_input) txt_dir_input.classList.toggle('display-none', false);
            if (json_dir_input) json_dir_input.classList.toggle('display-none', true);
        }
    })
}

show_json_txt_dir_input()

// Video Inspection Panel Toggle Functionality
let IsVideoInspectionShowing = true
let toggle_video_inspection = document.querySelector('#toggle_video_inspection')
let video_inspection_toggle_container = document.querySelector('#video-inspection-toggle')

function handle_toggle_video_inspection() {
    let video_inspection = document.querySelector('#video_inspection')

    if (IsVideoInspectionShowing) {
        // Hide the video inspection panel
        video_inspection.classList.remove('panel-open')
        IsVideoInspectionShowing = false

        // Update toggle button state
        if (toggle_video_inspection) {
            toggle_video_inspection.classList.remove('panel-toggle-active')
            toggle_video_inspection.setAttribute('aria-expanded', 'false')
            let arrowIcon = toggle_video_inspection.querySelector('.toggle-btn-arrow .material-icons')
            if (arrowIcon) arrowIcon.textContent = 'expand_more'
        }
    } else {
        // Show the video inspection panel
        video_inspection.classList.add('panel-open')
        IsVideoInspectionShowing = true

        // Update toggle button state
        if (toggle_video_inspection) {
            toggle_video_inspection.classList.add('panel-toggle-active')
            toggle_video_inspection.setAttribute('aria-expanded', 'true')
            let arrowIcon = toggle_video_inspection.querySelector('.toggle-btn-arrow .material-icons')
            if (arrowIcon) arrowIcon.textContent = 'expand_less'
        }
    }
}

if (toggle_video_inspection) {
    toggle_video_inspection.addEventListener('click', handle_toggle_video_inspection)
}

// Close buttons for panels
let annotation_stats_close = document.querySelector('#annotation-stats .panel-close-btn')
if (annotation_stats_close) {
    annotation_stats_close.addEventListener('click', () => {
        let annotation_stats = document.querySelector('#annotation-stats')
        annotation_stats.classList.remove('panel-open')
        IsJobSummaryShowing = false

        if (show_job_summary) {
            show_job_summary.setAttribute('aria-expanded', 'false')
            let arrowIcon = show_job_summary.querySelector('.toggle-btn-arrow .material-icons')
            if (arrowIcon) arrowIcon.textContent = 'expand_more'
            let subtitle = show_job_summary.querySelector('.toggle-btn-subtitle')
            if (subtitle) subtitle.textContent = 'View annotation statistics'
        }
    })
}

// Close video preview button
let close_video_preview = document.querySelector('#close-video-preview')
if (close_video_preview) {
    close_video_preview.addEventListener('click', () => {
        let video_inspection = document.querySelector('#video_inspection')
        video_inspection.classList.remove('panel-open')

        if (video_inspection_toggle_container) {
            video_inspection_toggle_container.classList.add('display-none')
        }

        // Remove active state from all category items
        let allCategoryItems = document.querySelectorAll('.category-item')
        allCategoryItems.forEach((item) => {
            item.classList.remove('active')
        })

        IsVideoInspectionShowing = false
    })
}

// Collapse video list sidebar
let collapse_video_list = document.querySelector('#collapse-video-list')
if (collapse_video_list) {
    collapse_video_list.addEventListener('click', () => {
        let video_list_admin = document.querySelector('#video_list_admin')
        let video_list_sidebar = document.querySelector('.video-list-sidebar-pro')

        // Toggle collapse on both for compatibility
        if (video_list_sidebar) {
            video_list_sidebar.classList.toggle('collapsed')
        }
        if (video_list_admin) {
            video_list_admin.classList.toggle('collapsed')
        }
        collapse_video_list.classList.toggle('collapsed')

        // Update icon direction
        let icon = collapse_video_list.querySelector('.material-icons')
        if (icon) {
            if (collapse_video_list.classList.contains('collapsed')) {
                icon.textContent = 'chevron_right'
            } else {
                icon.textContent = 'chevron_left'
            }
        }
    })
}

// Fullscreen video button functionality
let fullscreenBtn = document.querySelector('#fullscreen-video')
if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
        let videoContainer = document.querySelector('#vid_tag')
        let video = videoContainer ? videoContainer.querySelector('video') : null
        let iframe = videoContainer ? videoContainer.querySelector('iframe') : null

        let elementToFullscreen = video || iframe || videoContainer

        if (elementToFullscreen) {
            if (elementToFullscreen.requestFullscreen) {
                elementToFullscreen.requestFullscreen()
            } else if (elementToFullscreen.webkitRequestFullscreen) {
                elementToFullscreen.webkitRequestFullscreen()
            } else if (elementToFullscreen.msRequestFullscreen) {
                elementToFullscreen.msRequestFullscreen()
            }
        }
    })
}

// Video Action Bar Button Handlers
let adminEditResponseBtn = document.querySelector('#admin-edit-response')
let adminApproveVideoBtn = document.querySelector('#admin-approve-video')
let adminRejectVideoBtn = document.querySelector('#admin-reject-video')
let adminClosePreviewBtn = document.querySelector('#admin-close-preview')

// Helper function to show action bar in "edit mode" (approve/reject/close visible, edit hidden)
function showActionBarEditMode() {
    if (adminEditResponseBtn) adminEditResponseBtn.classList.add('display-none')
    if (adminApproveVideoBtn) adminApproveVideoBtn.classList.remove('display-none')
    if (adminRejectVideoBtn) adminRejectVideoBtn.classList.remove('display-none')
    if (adminClosePreviewBtn) adminClosePreviewBtn.classList.remove('display-none')
}

// Helper function to show action bar in "default mode" (only edit visible)
function showActionBarDefaultMode() {
    if (adminEditResponseBtn) adminEditResponseBtn.classList.remove('display-none')
    if (adminApproveVideoBtn) adminApproveVideoBtn.classList.add('display-none')
    if (adminRejectVideoBtn) adminRejectVideoBtn.classList.add('display-none')
    if (adminClosePreviewBtn) adminClosePreviewBtn.classList.add('display-none')
}

// Initialize: hide approve, reject, close buttons on load
showActionBarDefaultMode()

// Edit Response Button - shows approve/reject/close options
if (adminEditResponseBtn) {
    adminEditResponseBtn.addEventListener('click', () => {
        // First, trigger the legacy edit response button to create the actual approve/reject buttons
        let legacyEditBtn = document.querySelector('#edit_res input[value="edit response"]') ||
                           document.querySelector('#edit_res input.nist-button')
        if (legacyEditBtn && legacyEditBtn.value === 'edit response') {
            legacyEditBtn.click()
        }

        // Show approve/reject/close buttons, hide edit button
        showActionBarEditMode()

        // Scroll to Q&A section for context
        let qaSection = document.querySelector('.qa-section')
        if (qaSection) {
            qaSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    })
}

// Approve Video Button
if (adminApproveVideoBtn) {
    adminApproveVideoBtn.addEventListener('click', () => {
        // Find and click the existing approve button from the legacy action-control
        let approveBtn = document.querySelector('.btn_apr_rej[value="approve"]') ||
                         document.querySelector('#apr_rej_btn_div input[value="approve"]') ||
                         document.querySelector('#action-control input[value="approve"]')
        if (approveBtn) {
            approveBtn.click()
            // Return to default mode after action
            showActionBarDefaultMode()
        } else {
            console.warn('Approve button not found. Legacy buttons:', {
                apr_rej_div: document.querySelector('#apr_rej_btn_div'),
                action_control: document.querySelector('#action-control'),
                all_inputs: document.querySelectorAll('#action-control input')
            })
            alert('Please click "Edit Response" first before approving.')
        }
    })
}

// Reject Video Button
if (adminRejectVideoBtn) {
    adminRejectVideoBtn.addEventListener('click', () => {
        // Find and click the existing reject button from the legacy action-control
        let rejectBtn = document.querySelector('.btn_apr_rej[value="reject"]') ||
                        document.querySelector('#apr_rej_btn_div input[value="reject"]') ||
                        document.querySelector('#action-control input[value="reject"]')
        if (rejectBtn) {
            rejectBtn.click()
            // Return to default mode after action
            showActionBarDefaultMode()
        } else {
            console.warn('Reject button not found. Legacy buttons:', {
                apr_rej_div: document.querySelector('#apr_rej_btn_div'),
                action_control: document.querySelector('#action-control'),
                all_inputs: document.querySelectorAll('#action-control input')
            })
            alert('Please click "Edit Response" first before rejecting.')
        }
    })
}

// Close Button (in action bar) - hides approve/reject and shows edit response again
if (adminClosePreviewBtn) {
    adminClosePreviewBtn.addEventListener('click', () => {
        // First, trigger the legacy edit response button to hide the approve/reject buttons
        // The legacy button value changes to "close" when approve/reject buttons are shown
        let legacyEditBtn = document.querySelector('#edit_res input.nist-button')
        if (legacyEditBtn && legacyEditBtn.value === 'close') {
            legacyEditBtn.click()
        }

        // Return to default mode (show edit, hide approve/reject/close)
        showActionBarDefaultMode()
    })
}

// Function to show video inspection panel (called when category is clicked)
function showVideoInspectionPanel(categoryName) {
    let video_inspection = document.querySelector('#video_inspection')

    // Show the toggle button container
    if (video_inspection_toggle_container) {
        video_inspection_toggle_container.classList.remove('display-none')
    }

    // Update the category name in the toggle button
    let current_category_name = document.querySelector('#current-category-name')
    if (current_category_name && categoryName) {
        current_category_name.textContent = `Viewing: ${categoryName}`
    }

    // Show the panel
    video_inspection.classList.add('panel-open')
    video_inspection.classList.remove('display-none')
    IsVideoInspectionShowing = true

    // Update toggle button state
    if (toggle_video_inspection) {
        toggle_video_inspection.classList.add('panel-toggle-active')
        toggle_video_inspection.setAttribute('aria-expanded', 'true')
        let arrowIcon = toggle_video_inspection.querySelector('.toggle-btn-arrow .material-icons')
        if (arrowIcon) arrowIcon.textContent = 'expand_less'
    }
}

export {handle_show_job_summary, showVideoInspectionPanel}