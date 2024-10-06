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

if (btn_vid_upload == null){
    // checks if the displayed page is for admin
    let end_annotation = document.querySelector('#end-annotation')
    end_annotation.addEventListener('click', (e)=> {
        let target_elem = e.target
        
    
        if (target_elem.innerText.trim().includes('Annotation Ended')){
            console.log("annotation ended");
            
            
        }else{
            let user = document.getElementById('last_name').innerText.split(' ')[1]
            let end_annotation_endpoint = `${base_url}/end_annotation?user=${user}`
            let response = fetch(end_annotation_endpoint, {
                method: 'GET'
            })
            .then(response => response.json()) 
            .then((data)=>{
                console.log(data);
                
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

function create_vidlist_disp_span(file_name, checked_by, status, video_url, assoc_category){
    
    
    
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
        
        if ((cur_span.textContent == 'done') || (cur_span.textContent == 'close')){
            let parent_elem = cur_span.parentNode
            var file_name = parent_elem.id.split('_')[1]    
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
        if (checked_by==null){
            let apr_rej_btn = create_apr_rej(file_name, assoc_category) 
            vid_tag.appendChild(apr_rej_btn)
        }else{
            let edit_btn_div = create_edit_btn()
            vid_tag.appendChild(edit_btn_div)
        }
        
        
        span_heading.textContent = file_name
        video_name.appendChild(span_heading)
        video_name.appendChild(br_elem)
        video_name.appendChild(span_category)
    })

    return span

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
        data.forEach((video)=>{
            let video_fields = video['fields']

            let checked_by = video_fields['checked_by']
            let file_name = video_fields['file_name']
            let status = video_fields['status'] //normall null
            let video_url = video_fields['video']
            let cur_span = create_vidlist_disp_span(file_name, checked_by, status, video_url, assoc_category)
            video_list_disp.appendChild(cur_span)
            // console.log(checked_by, file_name, status, video_url);
            
        })   
        
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
        // console.log("default loaded: ", assoc_category);
        
        // console.log("cluster_group", cluster_group);
        
        // fetch_paginated_vid(assoc_category, full_get_videos_per_category=full_get_videos_per_category)
        let cluster_id_i = document.createElement('i')
       
        cluster_id_i.textContent = cluster_id
        cluster_id_i.classList.add("visibility_hidden")
        // console.log("cluster_id_i", cluster_id_i);
        
       
        cat_name.textContent = category
        
        // console.log("cat", category, "cluster", cluster_group);
        
        cat_name.classList.add('tm_headings')
        fecth_all_videos_in_category(get_videos_per_category, assoc_category)
        // fetch_vids(null, category=category, cluster_group=cluster_group)
        
   
    })
    
})


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


function get_next_video(file_name, assoc_category, appr_rej){
    // console.log('filename', file_name);
   var prev_file_name = file_name
    
    

    let get_next_video_endpoint = base_url+`/get_next_video?file_name=${file_name}&appr_rej=${appr_rej}`
    // get_next_video_endpoint = get_next_video_endpoint+file_name
    let response = fetch(get_next_video_endpoint, {
        method: 'GET'
    })
    .then(response => response.json())
    .then((data)=>{
        
        const[span_heading, br_elem, span_category] = create_vidname_category_spans(assoc_category)
        let vid_preview = document.getElementById('vid_preview')
        let vid_tag = document.getElementById('vid_tag')
        let video_name = document.querySelector('#video_name')
        video_name.innerHTML = ""
        vid_tag.innerHTML = ""

        let next_video = data[0]
       
        let video_fields = next_video['fields']
        let file_name = video_fields['file_name']
        let video_url = video_fields['video'] 

        span_heading.textContent = file_name
        video_name.appendChild(span_heading)
        video_name.appendChild(br_elem)
        video_name.appendChild(span_category)
        

        const video = create_video_tag()
        video.src =  base_vid_src+video_url
        vid_tag.appendChild(video)
        let apr_rej_btn = create_apr_rej(file_name, assoc_category) 
        vid_tag.appendChild(apr_rej_btn)
        vid_preview.appendChild(vid_tag)
        mark_good_bad(prev_file_name, appr_rej)

        
    })
    

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



var create_apr_rej = function appr_rej(file_name, assoc_category){
    
    
    let div = document.createElement('div')
    div.id = 'apr_rej_btn_div'
    div.classList.add('apr_rej_btn_div')

    
    let approve_input = document.createElement('input')
    approve_input.type = 'button'
    approve_input.value = 'approve'
    approve_input.className = 'nist-button btn_apr_rej'

    approve_input.addEventListener('click', ()=>{
        
        get_next_video(file_name, assoc_category, 'approve')
   
        
    })
    div.appendChild(approve_input)

    // create reject button and add and event listener to it
    let reject_input = document.createElement('input')
    reject_input.type = 'button'
    reject_input.value = 'reject'
    reject_input.className = 'nist-button btn_apr_rej'

    reject_input.addEventListener('click', ()=>{
        
        get_next_video(file_name, assoc_category, 'reject')
   
      
    })
    div.appendChild(reject_input)

    return div
}

function create_edit_btn(){
    let div = document.createElement('div')
    div.id = 'edit_res'
    div.style.textAlign = 'center'

    let btn = document.createElement('input')
    btn.type = 'button'
    btn.value = 'edit response'
    btn.classList.add('nist-button')

    btn.addEventListener('click', ()=>{
        let edit_div = document.getElementById('edit_res')
        app_rej_btn_div = create_apr_rej()
        let childnodes  = edit_div.childNodes
        // check if appr or reject button has already been 
        // added to edit response
        
        if (childnodes.length === 1){
            edit_div.appendChild(app_rej_btn_div)
        }else{
            let apr_rej_btn_div = document.getElementById('apr_rej_btn_div')
            edit_div.removeChild(apr_rej_btn_div)
           
        }
        
    })

    div.appendChild(btn)

    return div
}


export {create_apr_rej}