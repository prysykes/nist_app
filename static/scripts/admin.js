var user_processed_categories = document.querySelectorAll('.user-processed-categories')
var video_categories = document.querySelectorAll('.video_categories')
var show_job_summary = document.querySelector('#show_job_summary')
var export_all_videos = document.querySelector('#export-all-videos')
var per_cluster_approve = document.querySelectorAll('.per-cluster-approve')

import {create_apr_rej, allow_edit_and_show_qa, create_vidname_category_spans,
    create_video_tag, prepare_quest_answer_resp, create_edit_btn, create_qa_btn_controls,
   create_video_QA_form} from './main.js'



let IsJobSummaryShowing = false
const root_url = window.location.origin
const VIDEO_TYPE_ = "video/webm"
const base_vid_src = "media/"

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
        console.log(("custom confirm per cluster"));
        
        btn_yes.addEventListener('click', ()=>{
            // handle per cluster rejection
            
            if (cat_elem.innerText.toLowerCase() == "approved"){
                // reject a cluster
                // console.log("in reject", cat_elem.innerText);
                confirm_message.innerText = "Do you want to cancel approval?"
                confirm_overlay.style.display = 'none'
                endpoint = endpoint + "&status=rejected"
                console.log("::>>", endpoint);
                
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

function populate_and_show_annotation_stats(data){
    // let show_job_summary = document.querySelector('#show_job_summary')
    
   
    // let annotation_stats_table = document.getElementById('annotation-stats-table')
    
    let thead = document.getElementById('admin-thead')
    let tbody = document.getElementById('admin-tbody')
    tbody.innerHTML = ""
    if (thead.innerHTML == ""){
        set_default_th(thead)
    }
    console.log("data>>", data);
    
    // data
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

}
    

show_job_summary.addEventListener('click', ()=>{
    let annotation_stats = document.querySelector('#annotation-stats')
     // show_job_summary
     if (!IsJobSummaryShowing){
        annotation_stats.classList.add('align-items-center')
        IsJobSummaryShowing = true
        show_job_summary.innerText = 'Hide Job Summary'
    }
    else if(IsJobSummaryShowing){
        annotation_stats.classList.remove('align-items-center')
        IsJobSummaryShowing = false
        show_job_summary.innerText = 'Show Job Summary'
    }
    // populate_and_show_annotation_stats(annotation_stats)
    // fetch endport for job summary
     let endpoint = `${root_url}/get_job_summary`

    let response = fetch(endpoint, {
        method: "GET"
    })
    .then(response => response.json())
    .then((data)=>{
        // console.log("data!!!!", data);
        populate_and_show_annotation_stats(data)
        
    })
    
})

function approve_single_cluster(endpoint){
    // console.log(">>", endpoint);
    
    let response = fetch(endpoint, {
        method: "GET"
    })
    .then(response => response.json())
    .then((data)=>{
        // console.log("dat!!a>>", data);
        populate_and_show_annotation_stats(data)
        
    })
}

// approve cluster = approve

// approved = reject

per_cluster_approve.forEach((cat_elem)=>{
    // console.log("cat_elem", cat_elem);
    
    cat_elem.addEventListener("click", ()=>{
        // console.log("per cluster clicked");
        
        let cat_elem_text = cat_elem.innerText
        let cur_elem_parent = cat_elem.parentNode
        
        let cluster_keyword = cur_elem_parent.innerText.trim().split(" ")[0]
        let endpoint = `${root_url}/admin_approve?cluster_keyword=${cluster_keyword}`
        if (cat_elem_text == "approve"){
            endpoint = endpoint + "&status=approved"
            // ght_sky_background&status=approved
﻿
            // console.log("endpoint per cluster", endpoint)
            approve_single_cluster(endpoint)
            cat_elem.innerText = "reject"
            cat_elem.classList.remove('cat-approve-status-false')
            cat_elem.classList.add("cat-approve-status-true")

            
        }else if(cat_elem_text == "reject"){
            endpoint = endpoint + "&status=rejected"
            approve_single_cluster(endpoint)
            cat_elem.innerText = "approve"
            cat_elem.classList.remove('cat-approve-status-true')
            cat_elem.classList.add("cat-approve-status-false")
            
            
        }
        
        
    })
    
    
})

function prepare_full_load_admin(annotator, category_list_ul){
    // let user_categories_div = approve_all_videos_btn.parentNode.parentNode
    let user_categories_list =  category_list_ul.querySelectorAll('li')
    // retrieve all video categories for the user
    let li_array = Array.from(user_categories_list)
    // console.log("li_array", li_array);
    
    
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

// {endpoint:endpoint, category_list_ul:category_list_ul}
function approve_all_videos({endpoint=endpoint,category_list_ul=category_list_ul}){
   
    let all_cluster_keyword_li = category_list_ul.querySelectorAll('li')
    let response_data = null;
    // replace cluster keyword spans based on user selection
    if (endpoint.includes('approved')){
        // cat-approve-status-false 
        // console.log("endpoint approved clicked");
        all_cluster_keyword_li.forEach((li)=>{
            let cluster_keyword_span = li.childNodes[3]
            cluster_keyword_span.classList.remove('cat-approve-status-false')
            cluster_keyword_span.classList.add('cat-approve-status-true')
            cluster_keyword_span.innerText = "reject"
            // console.log("li", li.childNodes[3]);
            
        })
        
    }
    else if(endpoint.includes('rejected')){
        all_cluster_keyword_li.forEach((li)=>{
            let cluster_keyword_span = li.childNodes[3]
            cluster_keyword_span.classList.remove('cat-approve-status-true')
            cluster_keyword_span.classList.add('cat-approve-status-false')
            cluster_keyword_span.innerText = "approve"
            // console.log("li", li.childNodes[3]);
            
        })
    }
    
    // perform fetch, send request to backend

    let response = fetch(endpoint, {
        method: 'GET'
    })
    .then(response => response.json())
    .then((data)=>{
        // do something on export jobs based on returned data
        console.log('!!>>', data);
        populate_and_show_annotation_stats(data)
        // return data
        // response_data = data
        
        
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
        let annotator = vid_categories.querySelector('h3').innerText.split('-')[1]
        let category_list_ul = vid_categories.querySelector('ul')
        let full_load = prepare_full_load_admin(annotator, category_list_ul)
        let status = "approved"
        // console.log(annotator);
        // console.log(category_list_ul);
        let endpoint = `${root_url}/admin_approve?user_catergories=${full_load}&status=${status}`
        let kwargs = {endpoint:endpoint, category_list_ul:category_list_ul}
        approve_all_videos(kwargs)
 
        
    })

    reject_all_videos_btn.addEventListener('click', ()=>{
        // 'rejected'
        

        let vid_categories = approve_all_videos_btn.parentElement.parentElement
        let annotator = vid_categories.querySelector('h3').innerText.split('-')[1]
        let category_list_ul = vid_categories.querySelector('ul')
        let full_load = prepare_full_load_admin(annotator, category_list_ul)
        let status = "rejected"
        // console.log(annotator);
        // console.log(category_list_ul);
        let endpoint = `${root_url}/admin_approve?user_catergories=${full_load}&status=${status}`
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

function preview_video_admin({file_name=null, cluster_keywords=null, video_url=null, 
                                checked_by=null, question_tag=null, project_type=null}){


    const[span_heading, br_elem, span_category] = create_vidname_category_spans(cluster_keywords)
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

    if (checked_by){
        console.log("checked_by", checked_by);
        
        var question_tag = document.querySelector('#question_tag')
        allow_edit_and_show_qa({checked_by:checked_by, project_type:project_type, 
            file_name:file_name, cluster_keywords:cluster_keywords, question_tag:question_tag})
        
    }
   
    

}

function remove_active_marks(parent_elem){
    let child_nodes = parent_elem.childNodes

    child_nodes.forEach((node)=>{
        node.classList.remove('active')
    })

}
function create_ul_elements_with_videos({data=null, cluster_keywords=null, project_type=null}){
    // console.log("response_data", response_data);
    // check if the ul element is already create, else create it
    let ul_elem = document.getElementById('admin_video_ul')
    let video_list_admin = document.querySelector('#video_list_admin')
    

    if (ul_elem == null) {
        ul_elem = document.createElement('ul')
        ul_elem.id = 'admin_video_ul'
    }else{
        ul_elem.innerHTML = ""
    }


    

    let count = 0
    for (const [key, value] of Object.entries(data)){
        let file_name = value['fields']['file_name']
        let keywords = value['fields']['keywords']
        let video_url = value['fields']['video']
        let checked_by = value['fields']['checked_by']
        let li_elem = document.createElement('li')
        li_elem.id = `${file_name}`
        li_elem.innerText = file_name  

        let target_elem = li_elem
        if (count==0){
            target_elem = li_elem
            remove_active_marks(ul_elem)
            
            preview_video_admin({file_name:file_name, cluster_keywords:cluster_keywords, video_url:video_url, 
                checked_by:checked_by, question_tag:question_tag, project_type:project_type})
            target_elem.classList = 'active'
        }
        
        li_elem.addEventListener('click', (e) => { 
            remove_active_marks(ul_elem)
            
            
            preview_video_admin({file_name:file_name, cluster_keywords:cluster_keywords, video_url:video_url, 
                checked_by:checked_by, question_tag:question_tag, project_type:project_type})
            let target_elem = e.target
            target_elem.classList = 'active'
           
            
            
        })

        ul_elem.appendChild(li_elem)

        count = count+1
        
    }
    
    return ul_elem
}

user_processed_categories.forEach((category)=>{
    let project_type = document.querySelector('#project_type').innerText.trim()
    category.addEventListener('click', (e) => {
        // let admin_video_preview = document.querySelector('#admin-video-preview')
        //     admin_video_preview.innerHTML = ""
        let cluster_keywords = category.innerText.trim()
        user_processed_categories.forEach((cat)=> {
            cat.classList.remove('active')
        })
        let li = e.target
        li.classList.add('active')
        let video_inspection = document.querySelector('#video_inspection')
    
        if (video_inspection.classList.contains('display-none')){
          
            video_inspection.classList.remove('display-none')
            video_inspection.classList.add('row-align_base')     
            
        }else{

        }
        
        // select h3 element that holds the annotator's name
        let h3_elem_text = category.parentElement.parentElement.parentElement.childNodes[3].innerText

        
        let annotator = h3_elem_text.trim().split(' - ')[1].split(" ")[0]
        
        let isAdmin = null
        let admin_project_type_span = document.getElementById('project_type')
        
        if (admin_project_type_span){
            isAdmin = true
            var get_category_endpoint = `${root_url}/display_videos?category=${cluster_keywords}&annotator=${annotator}&project_type=${project_type}&is_admin=${isAdmin}`
            
            
        }else{
            var get_category_endpoint = `${root_url}/display_videos?category=${cluster_keywords}&annotator=${annotator}&project_type=${project_type}`
        }
    
        
        
        let response = fetch(get_category_endpoint, {
            method: 'GET'
        })
        .then(response => response.json())
        .then((data)=>{
            
            
            let video_list_admin = document.querySelector('#video_list_admin')

            let ul_elem = create_ul_elements_with_videos({data:data, cluster_keywords:cluster_keywords, project_type:project_type})
            video_list_admin.appendChild(ul_elem)

            
            
        })
    })
})