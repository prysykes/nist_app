var user_processed_categories = document.querySelectorAll('.user-processed-categories')
var video_categories = document.querySelectorAll('.video_categories')
var export_jobs = document.querySelector('#export-jobs')
var export_all_videos = document.querySelector('#export-all-videos')
var per_cluster_approve = document.querySelectorAll('.per-cluster-approve')

import {create_apr_rej} from './main.js'

// console.log(typeof create_apr_rej);



const root_url = window.location.origin
const VIDEO_TYPE_ = "video/webm"

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
    console.log("usernames_str", usernames_str);
    
    
    let endpoint = `${root_url}/export_all_videos?usernames=${usernames_str}`
    let response = fetch(endpoint, {
        method: 'GET'
    })
    .then(response => response.json())
    .then((data)=> {
        let data_finished_job_csv = data['finished_job_csv']
        let data_finished_job_zip = data['zip_file_path']

        let download_jobs_div = document.getElementById('download-jobs') 
        download_jobs_div.classList.toggle('display-none')

        let videos_zip = document.getElementById('videos-zip')
        let csv_file = document.getElementById('csv-file')
        csv_file.innerHTML = ""
        videos_zip.innerHTML = ""
        
        // create a tag
        let a_tag_csv = document.createElement('a')
        a_tag_csv.href = data_finished_job_csv 
        a_tag_csv.innerText = "Download CSV"
        csv_file.appendChild(a_tag_csv) 

        let a_tag_zip = document.createElement('a')
        a_tag_zip.href = data_finished_job_zip
        a_tag_zip.innerText = "Download compressed videos"
        videos_zip.appendChild(a_tag_zip) 
        
        
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

    if (caller){
        let child_node = cat_elem.childNodes
        let cur_h3 = child_node[1] 
        let approve_all_videos_btn = cur_h3.childNodes[1]
        approve_all_videos_btn.innerText = inner_text
        let kwargs = {approve_video_fetch_promise:approve_video_fetch_promise, endpoint:endpoint, approve_all_videos_btn:approve_all_videos_btn, inner_text:inner_text, caller:caller, cat_elem:cat_elem}
        btn_yes.addEventListener('click', ()=>{
            callback(kwargs)
            approve_all_videos_btn.innerText = inner_text
            approve_all_videos_btn.classList = "cat-approve-status-false display-none"
            confirm_overlay.style.display = 'none'
        })
        
        
        
    }
    else if (endpoint && !caller){
        console.log(("hiiii"));
        
        btn_yes.addEventListener('click', ()=>{
            
            if (cat_elem.innerText.toLowerCase() == "approved"){
                console.log("in reject", cat_elem.innerText);
                confirm_message.innerText = "Do you want to cancel approval?"
                confirm_overlay.style.display = 'none'
                endpoint = endpoint + "&status=reject"
                callback(endpoint)
                cat_elem.classList.remove('cat-approve-status-true')
                cat_elem.classList.add("cat-approve-status-false")
                cat_elem.innerText = "approve cluster"
            }else{
                console.log("in approve", cat_elem.innerText);
                
                endpoint = endpoint + "&status=approved"
                callback(endpoint)
                cat_elem.classList.remove('cat-approve-status-false')
                cat_elem.classList.add("cat-approve-status-true")
                cat_elem.innerText = "approved"
                // console.log("end", endpoint);
            }
            
            
        })
    }else{
        confirm_overlay.style.display = 'none'
        callback()
    }
    

    btn_cancel.addEventListener('click', ()=>{
        confirm_overlay.style.display = 'none'
        console.log("no export");
        
    })
}

export_all_videos.addEventListener('click', ()=>{
    
    let message = "Are you sure you want to export all videos?"
    let callback = handle_export_all_videos
    custom_confirm({message: message, callback: callback})

})

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

export_jobs.addEventListener('click', ()=>{
    let annotation_stats = document.querySelector('#annotation-stats')
    annotation_stats.classList.toggle('align-items-center')
    let annotation_stats_table = document.getElementById('annotation-stats-table')
    
    let thead = document.getElementById('admin-thead')
    let tbody = document.getElementById('admin-tbody')
    tbody.innerHTML = ""
    if (thead.innerHTML == ""){
        set_default_th(thead)
    }
    

    let endpoint = `${root_url}/export_job`
    let response = fetch(endpoint, {
        method: 'GET'
    })
    .then(response => response.json())
    .then((data)=> {
        data.forEach((data)=>{
            
            let tr_elem = document.createElement('tr')
            for (const [key, value] of Object.entries(data)){
                
                let td_elem = document.createElement('td')
                if (key == "user"){
                    td_elem.classList.add("tm-users")
                    
                }
                td_elem.innerText = value
                tr_elem.appendChild(td_elem)
                
            }
            tbody.appendChild(tr_elem)
            
         
            
        })
        
    })
    
    
})

function approve_single_cluster(endpoint){
    // console.log("endpoint", endpoint);
    
    let response = fetch(endpoint, {
        method: "GET"
    })
    .then(response => response.json())
    .then((data)=>{
        // console.log("data>>", data);
        
    })
}


per_cluster_approve.forEach((cat_elem)=>{
    // console.log("cat_elem", cat_elem);
    
    cat_elem.addEventListener("click", ()=>{
        let cat_elem_text = cat_elem.innerText
        let cur_elem_parent = cat_elem.parentNode
        let cluster_keyword = cur_elem_parent.innerText.trim().split(" ")[0]
        let endpoint = `${root_url}/admin_approve?cluster_keyword=${cluster_keyword}`
        if (cat_elem_text == "approve cluster"){
            endpoint = endpoint + "&status=approved"
            approve_single_cluster(endpoint)
            cat_elem.innerText = "approved"
            cat_elem.classList.remove('cat-approve-status-false')
            cat_elem.classList.add("cat-approve-status-true")
            
        }else{
            let message = "Do wish to cancel approval?"
            let callback = approve_single_cluster
            custom_confirm({message: message, callback: callback, endpoint:endpoint, cat_elem:cat_elem})
            
        }
        
        
    })
    
    
})

function prepare_full_load_admin(annotator, approve_all_videos_btn){
    let user_categories_div = approve_all_videos_btn.parentNode.parentNode
    let user_categories_list =  user_categories_div.childNodes[3].children
    // retrieve all video categories for the user
    let li_array = Array.from(user_categories_list)
    
    let set_of_categories = new Set() // used to store unique categories
    li_array.forEach((li_ele)=>{
        
        let category_text_value = li_ele.innerText.trim().split(" ")[0] // selects the category_keyword
        // console.log("li_ele", category_text_value)
        set_of_categories.add(category_text_value) 
        
    })
    let set_of_categories_array = Array.from(set_of_categories) // convert the set to an array
    let set_of_categories_array_str = set_of_categories_array.join('-') // make it a string split by _ at the backend
    let full_load = annotator+"-"+set_of_categories_array_str // send the annotator alongside the category list payload
    return full_load
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


function approve_all_videos({approve_video_fetch_promise=null, endpoint=endpoint, approve_all_videos_btn=null, inner_text=null, caller=null, cat_elem=null}){
    
    if (!approve_video_fetch_promise) {
        approve_video_fetch_promise = fetch(endpoint, {
            method: 'GET'
        })
        .then(approve_video_fetch_promise => approve_video_fetch_promise.json())
        .then((data)=>{
            // console.log(data);

        })
    }
    // console.log("approve_all_videos_btn", approve_all_videos_btn);
    if (!caller){
        // console.log("inner_text", inner_text, approve_all_videos_btn);

        
        approve_all_videos_btn.innerText = inner_text

        approve_all_videos_btn.classList = "cat-approve-status-true display-none"
    }

    if (endpoint.includes('approved')){
        let text_to_replace = "approved"
        let assoc_class = "cat-approve-status-true per-cluster-approve"
        replace_category_appr_rej(text_to_replace, assoc_class, cat_elem)
        console.log("just approved", cat_elem);
        
    }else{
        let text_to_replace = "approve cluster"
        let assoc_class = "cat-approve-status-false per-cluster-approve"
        console.log("just rejected", cat_elem);
        replace_category_appr_rej(text_to_replace, assoc_class, cat_elem)
        
    }
    
    
}

video_categories.forEach((cat_elem)=>{
    let h3 = cat_elem.childNodes[1]
    let h3_span = h3.querySelector('span')
    let approve_video_fetch_promise = null
    h3_span.addEventListener('click', ()=>{
        let h3_span_innerText = h3_span.innerText
        let already_approved = h3_span_innerText == "Approved" ? true : false
        
        let child_node = cat_elem.childNodes
        let cur_h3 = child_node[1]
        let annotator = cur_h3.innerText.split(' - ')[1].split(' ')[0]
        
        let approve_all_videos_btn = cur_h3.childNodes[1]
        let approve_all_videos_btn_innerText = approve_all_videos_btn.innerText 
        if (!already_approved){
            let full_load = prepare_full_load_admin(annotator, approve_all_videos_btn)
                
            let status = "approved"
            let inner_text = "Approved"
            
            let endpoint = `${root_url}/admin_approve?user_catergories=${full_load}&status=${status}`
            let kwargs = {approve_video_fetch_promise:approve_video_fetch_promise, endpoint:endpoint, approve_all_videos_btn:approve_all_videos_btn, inner_text:inner_text, cat_elem:cat_elem}

            approve_all_videos(kwargs)
            
            
        }
        else{
            let status = "rejected"
            let inner_text = "Approve Videos"
            let message = "Do you want you reject all approved clusters"
            let full_load = prepare_full_load_admin(annotator, approve_all_videos_btn)
            let endpoint = `${root_url}/admin_approve?user_catergories=${full_load}&status=${status}`
            let caller = "reject-allx"
            
            let callback = approve_all_videos
            let kwargs = {message:message, callback:callback, endpoint:endpoint, cat_elem:cat_elem, approve_video_fetch_promise:approve_video_fetch_promise, inner_text:inner_text, caller:caller}
            // console.log("approve_all_videos_btn >>", approve_all_videos_btn);
            
            // approve_all_videos(approve_video_fetch_promise, endpoint, approve_all_videos_btn, inner_text)
           custom_confirm(kwargs)
            // console.log("Approved, run reject cycle");
        }
        
         
        // let already_approved = 

    })
    
    
    cat_elem.addEventListener('mouseover', (e)=>{ 
        
        let child_node = cat_elem.childNodes
        let cur_h3 = child_node[1]
        let annotator = cur_h3.innerText.split(' - ')[1]
        let approve_all_videos_btn = cur_h3.childNodes[1]
        approve_all_videos_btn.classList.remove('display-none')
       

    })

    cat_elem.addEventListener('mouseout', (e)=>{
        approve_video_fetch_promise = null
        let child_nodes = cat_elem.childNodes
        let cur_h3 = child_nodes[1]
        let approve_all_videos_btn = cur_h3.childNodes[1]
        approve_all_videos_btn.classList.add('display-none')
        
        
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

function create_ul_elements_with_videos(data){
    // console.log("response_data", response_data);
    // check if the ul element is already create, else create it
    let ul_elem = document.getElementById('admin_video_ul')

    if (ul_elem == null) {
        ul_elem = document.createElement('ul')
        ul_elem.id = 'admin_video_ul'
    }else{
        ul_elem.innerHTML = ""
    }
        
    for (const [key, value] of Object.entries(data)){
        let file_name = value['fields']['file_name']
        let keywords = value['fields']['keywords']
        let video = value['fields']['video']
        // console.log(file_name, keywords, video);
        let li_elem = document.createElement('li')
        let span_elem = document.createElement('span')
        span_elem.innerText = video
        span_elem.id = file_name
        span_elem.classList.add('display-none')  
        li_elem.innerText = file_name  
        li_elem.appendChild(span_elem)
        
        li_elem.addEventListener('click', (e) => { 
            
            let target_element = e.target
            
            let cur_span_elem = target_element.childNodes[1]
            let video_preview_admin = document.getElementById('video_preview_admin')
            let video_player = document.getElementById('video_player_admin')
            let app_rej_btn_admin = document.getElementById('app_rej_btn_admin')
            app_rej_btn_admin.innerHTML = ""
            video_player.innerHTML = ""

            let video_url = cur_span_elem.innerText
            let full_video_url = "media"+"/"+video_url
            let video_tag = create_video_element()

            video_tag.src = full_video_url 
            video_player.appendChild(video_tag)
            let apr_rej_btn = create_apr_rej()
            app_rej_btn_admin.appendChild(apr_rej_btn)
            // console.log("video_url", video_url, 'video_preview_admin', video_preview_admin);
            
        })

        ul_elem.appendChild(li_elem)
    }
    return ul_elem
}

user_processed_categories.forEach((category)=>{
    category.addEventListener('click', (e) => {
        user_processed_categories.forEach((cat)=> {
            cat.classList.remove('active')
        })
        let li = e.target
        li.classList.add('active')
        let video_inspection = document.querySelector('#video_inspection')
    
        if (video_inspection.classList.contains('display-none')){
          
            video_inspection.classList.remove('display-none')
            
        }else{
        }
        // let category_text_value = li_ele.innerText.trim().split(" ")[0]
        let cluster_keywords = category.innerText.trim()
        
        // select h3 element that holds the user name
        let h3_elem_text = category.parentElement.parentElement.parentElement.firstElementChild.innerText
        let annotator = h3_elem_text.trim().split(' - ')[1].split(" ")[0]
        
        let get_category_endpoint = `${root_url}/display_videos?category=${cluster_keywords}&annotator=${annotator}`
        let response = fetch(get_category_endpoint, {
            method: 'GET'
        })
        .then(response => response.json())
        .then((data)=>{
            let video_list_admin = document.querySelector('#video_list_admin')

            let ul_elem = create_ul_elements_with_videos(data)
            video_list_admin.appendChild(ul_elem)
            
        })
    })
})