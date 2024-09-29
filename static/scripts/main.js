let login = document.querySelector('#tm-login')
let tm_login_form = document.querySelector('#tm_login_form')
let btn_vid_upload = document.querySelector('#upload_videos')
let div_vid_upld = document.querySelector('#video_upload')
let cat_headings = document.querySelectorAll('.cat_headings')
let cat_name = document.querySelector('#cat_name')
let video_list_disp = document.querySelector('#video_list_disp')
let vid_preview = document.getElementById('vid_preview')
// let video = document.querySelector('video')
let approve_btn = document.querySelector('#approve_btn')
let video_name = document.querySelector('#video_name')
// let progress = document.querySelectorAll('.cat_headings .progress')


// console.log(video_name);

var app_rej_btn_div = null

var VIDEO_TYPE = "video/webm"


//http://127.0.0.1:8000/display_videos?term=sports
const base_url = window.location.origin
const full_url_path = base_url+'/display_videos?term='
const paginated_vid_url = base_url+'/paginated_vid_list?term='
const get_unprocessed_vids = base_url+'/get_unprocessed_vids?selection='
const base_vid_src = "media/"

// let full_url_path = base_url+'/display_videos?term='
let process_user_sel_url = base_url+'/process_user_selection?selection='

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

let fetch_paginated_vid = function fetch_paginated_vids(category, full_paginated_vid_url=null, get_all_vids=null, file_name=null){
 
    let vid_preview = document.querySelector('#vid_preview')
    let video = document.querySelector('video')
    let vid_tag = document.querySelector('#vid_tag')
    vid_tag.innerHTML = ""
    // console.log(("full_paginated_vid_url", full_paginated_vid_url));
    
   
    let video_name = document.querySelector('#video_name')
    video_name.innerHTML = ""
    const[span_heading, br_elem, span_category] = create_vidname_category_spans(category)
   

    if (file_name == null){
        
        // console.log("full_paginated_vid_url", full_paginated_vid_url);
        
        // console.log('yes null');
        const response = fetch(full_paginated_vid_url, {
            method: 'GET'
        })
        .then(response => response.json())
        .then((data)=>{

            let video = create_video_tag()
            
            let vid_objs = Object.values(data)
            let vid_obj_arr = vid_obj_to_array(vid_objs)
            let cur_vid_obj = vid_obj_arr[0]
            let cur_vid_obj_filename = cur_vid_obj['file_name']
            let cur_vid_obj_url = cur_vid_obj['vid_url']
            let cur_vid_obj_checked_by = cur_vid_obj['checked_by']
            let full_vid_src = base_vid_src+cur_vid_obj_url

            console.log("cur_vid_obj_filename", cur_vid_obj_filename);
            
            
            
            span_heading.textContent = cur_vid_obj_filename
            video_name.appendChild(span_heading)
            video_name.appendChild(br_elem)
            video_name.appendChild(span_category)
            video.src = full_vid_src
            let appr_rej_btn = create_apr_rej()
            // console.log(('vid tag', vid_tag));
            vid_tag.appendChild(video)
            vid_tag.appendChild(appr_rej_btn)
            let vid_spans = document.querySelectorAll('.vid_name')

            let cur_span = null
            
            vid_spans.forEach((span)=>{
                span.classList.remove('active')
                let cur_vid_filename = span.id
                // console.log("cur_vid_filename ", cur_vid_filename );
                
                if (cur_vid_filename == cur_vid_obj_filename) {
                    console.log("yes it s");
                    cur_span = span
                    try {
                        cur_span.classList.add('active')
                        cur_span.focus()
                    }catch (error){
                        console.error("An error occured:", error.message)
                    }
                    
                }
                
                
                
            })
            // cur_span = document.getElementById(`${cur_vid_obj_filename}`)
           
       
            
            return cur_span
        })
    }
    
    else {
        // console.log("get_all_vids pt", get_all_vids);
        const response = fetch(get_all_vids, {
            method: 'GET'
        })
        
        
        .then(response => response.json())
        .then((data)=>{
            // console.log(data);
            let video = create_video_tag()
            
            let vid_objs = Object.values(data)
            let vid_obj_arr = vid_obj_to_array(vid_objs)

            vid_obj_arr.forEach((vid)=> {
                // console.log(vid);
                if (vid['file_name']==file_name){
                    let cur_vid_name = vid['file_name']
                    let cur_vid_url = vid['vid_url']
                    let cur_vid_checked_by = vid['checked_by']
                    let full_vidsrc = base_vid_src+cur_vid_url 
 
                    span_heading.textContent = cur_vid_name
                    // span_category = document.createElement('span')
                    // span_category.textContent = "Cluster Keyword:  " + category
                    video_name.appendChild(span_heading)
                    video_name.appendChild(br_elem)
                    video_name.appendChild(span_category)
                    video.src = full_vidsrc
                    
                    // console.log(('vid tag', vid_tag));
                    vid_tag.appendChild(video)
                    if (cur_vid_checked_by == null){
                        let appr_rej_btn = create_apr_rej()
                        vid_tag.appendChild(appr_rej_btn)
                    }
                    else{
                        let edit_btn_div = create_edit_btn()
                        vid_tag.appendChild(edit_btn_div)
                    }

                    let vid_spans = document.querySelectorAll('.vid_name')
                    vid_spans.forEach((span)=>{
                        span.classList.remove('active')
                    })
                    // select current clicked span based on html data attribute
                    let cur_span = document.querySelector(`[data-name=${CSS.escape(cur_vid_name)}]`)
                    cur_span.classList.add('active')
                    
                }
                // console.log(vid);
            })
            
            
        })
    }

    // check if apr_rej_btn has been created

    
    
}

cat_headings.forEach((elem)=>{
    //cluster_id
    cluster_id = elem.querySelector('.cluster_id').textContent
    cluster_group = elem.querySelector('.cluster_group').textContent
    // elem.classList.remove('active')
    // console.log("cluster_group", cluster_group);
    

    // console.log("cluster_id", cluster_id)

    
    let text_content = elem.innerText
    let category = text_content.split('-')[0]
    // let term = category.trim().split('|')[0]
    let term = cluster_id
    // console.log('termo', term);

    let full_paginated_vid_url = paginated_vid_url+term
    // console.log("1st full_paginated_vid_url", full_paginated_vid_url);
    
    full_paginated_vid_url = full_paginated_vid_url + `&group=${cluster_group}`

    // console.log("2nd full_paginated_vid_url", full_paginated_vid_url);
    elem.addEventListener('click', ()=>{
        let assoc_category = category.split('|')[0].trim()
        cat_headings.forEach((elem)=>{
            elem.classList.remove('active')
        })
        elem.classList.add('active')
        // console.log("default loaded: ", assoc_category);
        
        // console.log("cluster_group", cluster_group);
        fetch_paginated_vid(assoc_category, full_paginated_vid_url=full_paginated_vid_url)
        cluster_id_i = document.createElement('i')
       
        cluster_id_i.textContent = cluster_id
        cluster_id_i.classList.add("visibility_hidden")
        // console.log("cluster_id_i", cluster_id_i);
        
       
        cat_name.textContent = category
        
        // console.log("cat", category, "cluster", cluster_group);
        
        cat_name.classList.add('tm_headings')
        fetch_vids(video_file_name=null, category=category, cluster_group=cluster_group)
        
   
    })
    
})



function isEmptyNode(node){
    return node.innerHTML.trim() ==""
}
// console.log(isEmptyNode(video_list_disp), 'hmm');


function vid_obj_to_array(vid_objs){
    let vid_obj_arr = []
        // vid_objs = Object.values(data)
        // console.log('vid_objs**', vid_objs);
        for (const item in vid_objs){
            let cur_vid_obj = vid_objs[item]
            // console.log('cur_vid_obj**', cur_vid_obj['fields']);

            let cur_vid_obj_fields = cur_vid_obj['fields']
            let file_name = cur_vid_obj_fields['file_name']
            let vid_url = cur_vid_obj_fields['video']
            let checked_by = cur_vid_obj_fields['checked_by']
            let status = cur_vid_obj_fields['status']
            // new_field = []
            new_field_obj = {}
            new_field_obj['file_name'] = file_name
            new_field_obj['vid_url'] = vid_url
            new_field_obj['checked_by'] = checked_by
            new_field_obj['status'] = status
            
            vid_obj_arr.push(new_field_obj)
            
        }
        return vid_obj_arr
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

var process_appr_rej = function proc_appr_rej(endpoint, class_name=null, category=null){
    /**
     * 
     * Processes approve or reject button when clicked by the user
     * @param {string} endpoint - the url called by fetch api to process the user decision
     * @param {string} class_name = the name of the video file the user selected
     * @param {string} category - the category the video belongs to
     * @returns {boolean} true or false depending on if the function is request is successfully processed
     * 
     */

    let vid_tag = document.getElementById('vid_tag')
    vid_tag .innerHTML = ""
    let video_name = document.getElementById('video_name')
    const[span_heading, br_elem, span_category] = create_vidname_category_spans(category)
    
    
    let appr_rej_div = create_apr_rej()
    video_name.innerHTML = ""

    response = fetch(endpoint, {
        method: 'GET'
    })
    .then(response => response.json())
    .then((data)=>{
        // console.log('dataooo',data);
        let rem_total = data['rem_total']
        let serialized_rem_total = data['serialized_rem_total']
        let serialized_rem =JSON.parse(serialized_rem_total[0])
        
        
        serialized_rem = vid_obj_to_array(serialized_rem)
        // console.log("serialized_rem", serialized_rem);
        let serialized_total = JSON.parse(serialized_rem_total[1])
        serialized_total = vid_obj_to_array(serialized_total)
        
        let video = create_video_tag()
        

        let first_vid = serialized_rem[0]
        let next_vid = serialized_rem[1]
        let next_vid_name = next_vid['file_name']
        let next_vid_url = base_vid_src+next_vid['vid_url']
        video.src = next_vid_url
        vid_tag.appendChild(video)
        vid_tag.appendChild(appr_rej_div)

        let cat_name = document.querySelector('#cat_name');
        cluster_group = document.querySelector('.cluster_group').textContent
        c_cur_cat = cat_name.textContent
        cur_cat = cat_name.textContent.trim().split(' ')[0]

        span_category.textContent = "Cluster Keyword: " + cur_cat 
        span_heading.textContent = next_vid_name
        video_name.appendChild(span_heading)
        video_name.appendChild(br_elem)
        video_name.appendChild(span_category)

        fetch_vids(next_vid_name, cur_cat, cluster_group)
        let remaining = rem_total[0]
        let total = rem_total[1]
        let cat_rem_total = cur_cat+" "+"|"+remaining+"/"+total
        
        // retrieve the whole category class and check for any one matching 
        // current category to update the text content
        cat_headings.forEach((elem)=>{
            let cat_inner_text = elem.innerText
            cat_inner_text = cat_inner_text.split('|')[0].trim()
            if(class_name == String(cat_inner_text)){
                let progress = elem.children[0]
                console.log('elem', elem.children[0]);
                progress.innerText = "|"+remaining+"/"+total
            }
        })
        cat_name.textContent = cat_rem_total
        
    })

    return true
}

var create_apr_rej = function appr_rej(){
    
    
    let div = document.createElement('div')
    div.id = 'apr_rej_btn_div'
    div.classList.add('apr_rej_btn_div')

    // create approve button and add and event listener to it
    let video_name_tag = document.querySelector('#video_name')
    // console.log("video_name_tag", video_name_tag);
  
    let video_name = document.querySelector('#video_name_value')
    let category = document.querySelector("#cluster_keyword")
    if (category){
        category = category.textContent
    }else{
        category = null
    }
    
    
    if (video_name === undefined){
        video_name = video_name_tag.textContent
    }else {
        video_name = video_name.textContent
      
    }

    
    let approve_input = document.createElement('input')
    approve_input.type = 'button'
    approve_input.value = 'approve'
    approve_input.className = 'nist-button btn_apr_rej'

    approve_input.addEventListener('click', ()=>{

        // console.log("video_name", video_name, "video_name_category", video_name_category);
        
        cur_selection_load = video_name+'_'+'approve'
        let endpoint = get_unprocessed_vids+cur_selection_load
        let is_processed = process_appr_rej(endpoint,  class_name=video_name, category=category)
        

        // takes the cursor to the next span once the current span has been processed
        let cur_span = document.querySelector(`[data-name=${CSS.escape(video_name)}]`)
        // console.log("cur_span", cur_span);
        
        
        cur_span.classList.toggle('active')
        cur_span.focus()

        if (is_processed){
            // add good tick here
            let inlines = create_inline_elemets()
            let inline_good = inlines[0]
            cur_span.appendChild(inline_good )
            // reload the video display here to add the next video
            // console.log('approved clicked', cur_span);
        }
        
    })
    div.appendChild(approve_input)

    // create reject button and add and event listener to it
    let reject_input = document.createElement('input')
    reject_input.type = 'button'
    reject_input.value = 'reject'
    reject_input.className = 'nist-button btn_apr_rej'

    reject_input.addEventListener('click', ()=>{

        cur_selection_load = video_name+'_'+'reject'
        let endpoint = get_unprocessed_vids+cur_selection_load 
        let is_processed = process_appr_rej(endpoint, category=video_name)
        // console.log("endpoint", endpoint);
        
        let cur_span = document.querySelector(`[data-name=${CSS.escape(video_name)}]`)
        cur_span.classList.toggle('active')
        cur_span.focus()
        if (is_processed){
            // add good tick here
            let inlines = create_inline_elemets()
            let inline_bad = inlines[1]
            cur_span.appendChild(inline_bad)
            // console.log('reject clicked', cur_span);
        }
      
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
        let app_rej_btn_div = create_apr_rej()
        edit_div.appendChild(app_rej_btn_div)
    })

    div.appendChild(btn)

    return div
}

var fetch_vids = function fetch_videos(video_file_name=null, category=null, cluster_group=null){
    
    let full_url_path_term_p = base_url+'/display_videos'
    category = category.split('|')[0]
    full_url_path_term_p = `${full_url_path_term_p}?category=${category}&cluster_group=${cluster_group}`

   
    const response =  fetch(full_url_path_term_p, {
        method: 'GET'
    })
    .then(response => response.json())
    .then((data) => {
        video_list_disp.innerHTML = ''
        vid_objs = Object.values(data)
        // console.log('vid_objs**', typeof  vid_objs);
        // console.log(Object.values(vid_obj));
        vid_obj_arr = vid_obj_to_array(vid_objs)
        vid_obj_arr.forEach((elem)=>{            
            let file_name = elem['file_name']
            let vid_url = elem['vid_url']
            let checked_by = elem['checked_by']
            let status = elem['status']
            // console.log('checked_by', checked_by);

            let inlines = create_inline_elemets()

            // console.log(inline_i);
            let span = document.createElement('span')
            span.innerText = file_name
            span.id= file_name
            if (checked_by != null && status == true) {
                // console.log('yes', status);
                inline_good = inlines[0]
                span.appendChild(inline_good)
                // span.appendChild(inline_good)
            }
            else if (checked_by != null && status == false) {
                // console.log('no');
                inline_bad = inlines[1]
                span.appendChild(inline_bad)
            }
            span.classList.add('vid_name')
            span.addEventListener('click', (e)=>{
                
                console.log("file_name", file_name);
              
                fetch_paginated_vid(category, full_paginated_vid_url=null, get_all_vids=full_url_path_term_p, file_name=file_name)

               
            })
          
            video_list_disp.appendChild(span)
        })
        
    }
    
    )
    
   complete = new Function() 
 return complete 
}


btn_vid_upload.addEventListener('click', ()=>{
    div_vid_upld.classList.toggle('display-none')
})

if (login != null) {
    login.addEventListener('click', ()=>{
        tm_login_form.classList.toggle('display-none');
    })
}
