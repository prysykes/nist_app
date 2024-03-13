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
let progress = document.querySelectorAll('.cat_headings .progress')

cat_headings_innerText = cat_headings[0].innerText
console.log(('progress', cat_headings_innerText));

// console.log(video_name);

var app_rej_btn_div = null


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
    video.type = "video/webm"

    return video
}

let fetch_paginated_vid = function fetch_paginated_vids(full_paginated_vid_url=null, get_all_vids=null, class_name=null){
    // console.log(`full_paginated_vid_url ${full_paginated_vid_url}, get_all_vids ${get_all_vids}, class_name ${class_name}`);
    let vid_preview = document.querySelector('#vid_preview')
    let video = document.querySelector('video')
    let vid_tag = document.querySelector('#vid_tag')
    vid_tag.innerHTML = ""
   
    let video_name = document.querySelector('#video_name')
    // vid_preview.classList.toggle('display-none')
    if (class_name == null){
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
            video_name.textContent = cur_vid_obj_filename
            video.src = full_vid_src
            let appr_rej_btn = create_apr_rej()
            // console.log(('vid tag', vid_tag));
            vid_tag.appendChild(video)
            vid_tag.appendChild(appr_rej_btn)
            let vid_spans = document.querySelectorAll('.vid_name')
            vid_spans.forEach((span)=>{
                span.classList.remove('active')
            })
            let cur_span = document.querySelector(`[data-name=${CSS.escape(cur_vid_obj_filename)}]`)
            cur_span.classList.add('active')
            return cur_span
        })
    }
    
    else {
        
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
                if (vid['file_name']==class_name){
                    let cur_vid_name = vid['file_name']
                    let cur_vid_url = vid['vid_url']
                    let cur_vid_checked_by = vid['checked_by']
                    let full_vidsrc = base_vid_src+cur_vid_url 
                    console.log('full_vidsrc ', full_vidsrc );
                    video_name.textContent = cur_vid_name
                    video.src = full_vidsrc
                    
                    // console.log(('vid tag', vid_tag));
                    vid_tag.appendChild(video)
                    if (cur_vid_checked_by == ''){
                        let appr_rej_btn = create_apr_rej()
                        vid_tag.appendChild(appr_rej_btn)
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
    let text_content = elem.innerText
    let category = text_content.split('-')[0]
    let term = category.trim().split('|')[0]
    console.log('termo', term);
    let full_paginated_vid_url = paginated_vid_url+term
    elem.addEventListener('click', ()=>{
        fetch_paginated_vid(full_paginated_vid_url=full_paginated_vid_url)
       
        cat_name.textContent = category
        cat_name.classList.add('tm_headings')
        fetch_vids(category)
        // delay_run(fetch_vids, category).then(
        //     // check_last_checked runs after the promise has been resolved
        //     // hence only runs after func1 (aft)
        //     // check_last_timeout = setTimeout(()=> {
        //     //     check_last(category=category, caller='delay_run')}, 2000)
        //     )
   
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

var process_appr_rej = function proc_appr_rej(endpoint, category=null){
    console.log('vid cataa', category);
    let vid_tag = document.getElementById('vid_tag')
    let video_name = document.getElementById('video_name')
    let video = create_video_tag()
    let appr_rej_div = create_apr_rej()
    vid_tag.innerHTML = ""
    console.log('vid_tag', vid_tag, video, appr_rej_div);
    console.log('ennd', endpoint);
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
        let serialized_total = JSON.parse(serialized_rem_total[1])
        serialized_total = vid_obj_to_array(serialized_total)

        let first_vid = serialized_rem[0]
        let first_vid_name = first_vid['file_name']
        video_name.textContent = first_vid_name
        let full_vid_url = base_vid_src+first_vid['vid_url']
        video.src = full_vid_url
        vid_tag.appendChild(video)
        vid_tag.appendChild(appr_rej_div)
        // console.log('serialized_rem', serialized_rem[0]['vid_url']);
        // serialized_rem.forEach((obj)=>{
        //     console.log('obj', obj);
        // })

        let cat_name = document.querySelector('#cat_name')
        // console.log('cat_name', cat_name);
        c_cur_cat = cat_name.textContent
        // console.log('c_cur_cat', c_cur_cat);
        cur_cat = cat_name.textContent.trim().split(' ')[0]
        // console.log('cat_name', cur_cat);
        fetch_vids(cur_cat)
        let remaining = rem_total[0]
        let total = rem_total[1]
        let cat_rem_total = cur_cat+" "+"|"+remaining+"/"+total
        
        // retrieve the whole category class and check for any one matching 
        // current category to update the text content
        cat_headings.forEach((elem)=>{
            let cat_inner_text = elem.innerText
            cat_inner_text = cat_inner_text.split('|')[0].trim()
            if(category == String(cat_inner_text)){
                let progress = elem.children[0]
                console.log('elem', elem.children[0]);
                progress.innerText = "|"+remaining+"/"+total
            }
        })
        cat_name.textContent = cat_rem_total
        // console.log('after cat_name', cat_name);
        // console.log('cat_rem_total', cat_rem_total);

        // console.log('rem_total', rem_total);
    })
}

var create_apr_rej = function appr_rej(){
    let div = document.createElement('div')
    div.id = 'apr_rej_btn_div'
    div.classList.add('apr_rej_btn_div')

    let approve_input = document.createElement('input')
    approve_input.type = 'button'
    approve_input.value = 'approve'
    approve_input.className = 'nist-button btn_apr_rej'
    approve_input.addEventListener('click', ()=>{
        let video = document.querySelector('video')
        let video_src = video.src
        let vid_file_name_cat = video_src.split('/').at(-1).split('_')
        let vid_file_name = vid_file_name_cat[0]
        let vid_category = vid_file_name_cat.at(-1).split('.')[0]
        // console.log(vid_file_name, vid_category, 'youp');
        cur_selection_load = vid_file_name+'_'+vid_category+'_'+'approve'
        let endpoint = get_unprocessed_vids+cur_selection_load 
        
        // endpoint = `${endpoint}&class_name=${vid_file_name}&apr_rej='approve'`
        process_appr_rej(endpoint, category=vid_category)
        // console.log('video', video_src);
        console.log('approved clicked');
    })
    div.appendChild(approve_input)

    let reject_input = document.createElement('input')
    reject_input.type = 'button'
    reject_input.value = 'reject'
    reject_input.className = 'nist-button btn_apr_rej'
    reject_input.addEventListener('click', ()=>{
        console.log('reject clicked');
    })
    div.appendChild(reject_input)

    return div
}

var fetch_vids = function fetch_videos(category){
    
    // console.log('approve_btn', approve_btn);
    // functions that fetches a list of videos from the database 
    // based on the category provided by the user
    
    category = category.trim()
    let full_url_path_term = full_url_path+category
    let term = category.split('|')[0].trim()
    // console.log('tterm', term);
    let full_url_path_term_p = full_url_path+term
    // console.log('full_paginated_vid_url', full_paginated_vid_url);
    const response =  fetch(full_url_path_term, {
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
            // console.log('checked_by', checked_by=='');

            let inlines = create_inline_elemets()

            // console.log(inline_i);
            let span = document.createElement('span')
            span.innerText = file_name
            span.dataset.name = file_name
            if (checked_by != '' && status == true) {
                // console.log('yes', status);
                inline_good = inlines[0]
                span.appendChild(inline_good)
                // span.appendChild(inline_good)
            }
            else if (checked_by != '' && status == false) {
                // console.log('no');
                inline_bad = inlines[1]
                span.appendChild(inline_bad)
            }
            span.classList.add('vid_name')
            span.addEventListener('click', (e)=>{
                video_name.textContent = file_name
                
                // let apr_rej_btn_div = document.querySelector('apr_rej_btn_div')
                // apr_rej_btn_div.remove()
                
                
                fetch_paginated_vid(full_paginated_vid_url=null, get_all_vids=full_url_path_term_p, class_name=file_name)

               
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
