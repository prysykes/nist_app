let login = document.querySelector('#tm-login')
let tm_login_form = document.querySelector('#tm_login_form')
let btn_vid_upload = document.querySelector('#upload_videos')
let div_vid_upld = document.querySelector('#video_upload')
let cat_headings = document.querySelectorAll('.cat_headings')
let cat_name = document.querySelector('#cat_name')
let video_list_disp = document.querySelector('#video_list_disp')
let vid_preview = document.getElementById('vid_preview')
let video = document.querySelector('video')
let approve_btn = document.querySelector('#approve_btn')
let video_name = document.querySelector('#video_name')

// console.log(video_name);

// var btn_apr_rej = null


//http://127.0.0.1:8000/display_videos?term=sports
let base_url = window.location.origin
let full_url_path = base_url+'/display_videos?term='

// let full_url_path = base_url+'/display_videos?term='
let process_user_sel_url = base_url+'/process_user_selection?selection='

function delay_run(func1, category){
    // delay run returns a promise after calling function 1
    return new Promise(func1(category))
    
    
}
cat_headings.forEach((elem)=>{
    let text_content = elem.textContent
    let category = text_content.split('-')[0]
    elem.addEventListener('click', ()=>{
        cat_name.textContent = category
        cat_name.classList.add('tm_headings')
        
        delay_run(fetch_vids, category).then(
            // check_last_checked runs after the promise has been resolved
            // hence only runs after func1 (aft)
            check_last_timeout = setTimeout(()=> {
                check_last(category)}, 5000)
            )
   
    })
    
    
})

function isEmptyNode(node){
    return node.innerHTML.trim() ==""
}
// console.log(isEmptyNode(video_list_disp), 'hmm');

var check_last = function check_last_checked(category=null){
    
    base_vid_src = "media/"
    category = category.trim()
    let full_url_path_term = full_url_path+category
    const response =  fetch(full_url_path_term, {
        method: 'GET'
    })
    .then(response => response.json())
    .then((data) => {
        // video_list_disp.innerHTML = ''
        vid_objs = Object.values(data)
        
        for (const item in vid_objs) {
            let cur_vid_obj = vid_objs[item]
            let cur_vid_obj_fields = cur_vid_obj['fields']
            let file_name = cur_vid_obj_fields['file_name']
            let vid_url = cur_vid_obj_fields['video']
            let checked_by = cur_vid_obj_fields['checked_by']
            let status = cur_vid_obj_fields['status']
            if (checked_by == ""){
               
                video_name.textContent = file_name
                
                cur_vid_src = base_vid_src+vid_url
                video.src = cur_vid_src
            }
        }
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

var create_apr_rej = function appr_rej(){
    let div = document.createElement('div')
    div.id = 'apr_rej_btn_div'
    div.classList.add('apr_rej_btn_div')

    let approve_input = document.createElement('input')
    approve_input.type = 'button'
    approve_input.value = 'approve'
    approve_input.className = 'nist-button btn_apr_rej'
    div.appendChild(approve_input)

    let reject_input = document.createElement('input')
    reject_input.type = 'button'
    reject_input.value = 'reject'
    reject_input.className = 'nist-button btn_apr_rej'
    div.appendChild(reject_input)

    return div
}

var fetch_vids = function fetch_videos(category){
    
    console.log('approve_btn', approve_btn);
    // functions that fetches a list of videos from the database 
    // based on the category provided by the user
    base_vid_src = "media/"
    category = category.trim()
    let full_url_path_term = full_url_path+category
    const response =  fetch(full_url_path_term, {
        method: 'GET'
    })
    .then(response => response.json())
    .then((data) => {
        video_list_disp.innerHTML = ''
        vid_objs = Object.values(data)
        console.log('vid_objs**', typeof  vid_objs);
        // console.log(Object.values(vid_obj));
        for (const item in vid_objs){
            let cur_vid_obj = vid_objs[item]
            // console.log('cur_vid_obj', cur_vid_obj);
            let cur_vid_obj_fields = cur_vid_obj['fields']
            let file_name = cur_vid_obj_fields['file_name']
            let vid_url = cur_vid_obj_fields['video']
            let checked_by = cur_vid_obj_fields['checked_by']
            let status = cur_vid_obj_fields['status']
            // console.log('checked_by', checked_by=='');

            let inlines = create_inline_elemets()

            // console.log(inline_i);
            let span = document.createElement('span')
            span.innerText = file_name
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
                
                // let apr_rej_btn_div = document.querySelector('apr_rej_btn_div')
                // apr_rej_btn_div.remove()
                
                span.classList.toggle('active')

                vid_preview.classList.toggle('display-none')
                cur_vid_src = base_vid_src+vid_url
                video.src = cur_vid_src
                if (checked_by == ""){
                    let vid_tag = document.querySelector('#vid_tag')
                    var apr_rej_btn_div = document.querySelector('#apr_rej_btn_div')
                    // console.log('apr_rej_btn_div:', apr_rej_btn_div)
                    if (apr_rej_btn_div == null){
                        apr_rej_div = create_apr_rej()
                        vid_tag.appendChild(apr_rej_div)
                    }
                    btn_apr_rej = document.querySelectorAll('.btn_apr_rej')
                    // console.log('btn_apr_rej', btn_apr_rej);
                    appr_rej_event(btn_apr_rej)
                    
                }
                else{
                    // let apr_rej_btn_div = document.querySelector('apr_rej_btn_div')
                    console.log('not empty', apr_rej_btn_div);
                    apr_rej_btn_div.remove()
                   
                }
               
            })
          
            video_list_disp.appendChild(span)
            
        }
    }
    
    )
    
   complete = new Function() 
 return complete 
}


preview_videos()
function preview_videos(){
    let vid_span = document.querySelectorAll('.vid_name')
    // vid_span.forEach((el)=> {
    //     el.addEventListener('click', ()=>{
            
    //     })
    // })
    
}


function fetch_processs_selction_endpoint(vid_file_name, vid_category, appr_rej=null){
    let cur_selection_load = vid_file_name+'_'+vid_category+'_'+appr_rej
    let process_user_sel_url_selectn = process_user_sel_url+cur_selection_load
    const response = fetch(process_user_sel_url_selectn, {
        method: 'GET'
    })
    .then(response => response.json())
    .then((data) => {
        console.log(data);
    })
    .then(()=>{
        fetch_vids(vid_category);
        }
        
    )
    
}

// console.log('btn_apr_rej', btn_apr_rej);
let appr_rej_event = function event_apr_rej(node){
    node.forEach((btn)=>{
        btn.addEventListener('click', ()=>{
            let cur_video = document.querySelectorAll('video')[0]
                vid_name_cat = cur_video.src
                // console.log('vidnamecat', vid_name_cat);
                //split and slice to retriev the classname_categoty from the video src url
                vid_name_cat = vid_name_cat.split(':').slice(-1)[0].split('/').slice(-1)[0].split('.')[0]
                vid_file_name = vid_name_cat.split('_')[0]
                vid_category = vid_name_cat.split('_')[1]
                // console.log('vidnamecat', vid_category);
            check_last(vid_category)
            if (btn.value == 'approve'){
                
                fetch_processs_selction_endpoint(vid_file_name, vid_category, appr_rej=btn.value);
            }
            else if(btn.value == 'reject'){
                
                fetch_processs_selction_endpoint(vid_file_name, vid_category, appr_rej=btn.value);
            }
        })
    })
}



btn_vid_upload.addEventListener('click', ()=>{
    div_vid_upld.classList.toggle('display-none')
})

if (login != null) {
    login.addEventListener('click', ()=>{
        tm_login_form.classList.toggle('display-none');
    })
}
