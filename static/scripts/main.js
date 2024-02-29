let login = document.querySelector('#tm-login')
let tm_login_form = document.querySelector('#tm_login_form')
let btn_vid_upload = document.querySelector('#upload_videos')
let div_vid_upld = document.querySelector('#video_upload')
let cat_headings = document.querySelectorAll('.cat_headings')
let cat_name = document.querySelector('#cat_name')
let video_list_disp = document.querySelector('#video_list_disp')
let vid_preview = document.getElementById('vid_preview')
let video = document.querySelector('video')
let btn_apr_rej = document.querySelectorAll('.btn_apr_rej')



//http://127.0.0.1:8000/display_videos?term=sports
let base_url = window.location.origin
let full_url_path = base_url+'/display_videos?term='

cat_headings.forEach((elem)=>{
    let text_content = elem.textContent
    let category = text_content.split('-')[0]
    elem.addEventListener('click', ()=>{
        cat_name.textContent = category
        cat_name.classList.add('tm_headings')
        fetch_videos(category)
    })
    
    
})



console.log(base_url, 'baseurl');
function fetch_videos(category){
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
        vid_obj = Object.values(data)
        // console.log(Object.values(vid_obj));
        for (const item in vid_obj){
            let cur_vid_obj = vid_obj[item]
            // console.log('cur_vid_obj', cur_vid_obj);
            let cur_vid_obj_fields = cur_vid_obj['fields']
            let file_name = cur_vid_obj_fields['file_name']
            let vid_url = cur_vid_obj_fields['video']
            let checked_by = cur_vid_obj_fields['checked_by']
            console.log('hecked_by', checked_by == '');
            // <i class="material-icons">done</i>
            let inline_i = document.createElement('i')
            inline_i.classList.add('material-icons')
            inline_i.style.color = 'green'
            inline_i.textContent = 'done'

            // console.log(inline_i);
            let span = document.createElement('span')
            span.innerText = file_name
            if (checked_by != '') {
                span.appendChild(inline_i)
            }
            
            span.classList.add('vid_name')
            span.addEventListener('click', ()=>{
                span.classList.toggle('active')

                vid_preview.classList.toggle('display-none')
                cur_vid_src = base_vid_src+vid_url
                video.src = cur_vid_src
                console.log('cur_vid_src ', cur_vid_src);
            })
            video_list_disp.appendChild(span)
            // console.log(`filename-${file_name} \t url- ${vid_url}`);
        }
    })
   

}
// let full_url_path = base_url+'/display_videos?term='
let process_user_sel_url = base_url+'/process_user_selection?selection='

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
    console.log('full_sel', process_user_sel_url_selectn);
}
btn_apr_rej.forEach((btn)=>{
    btn.addEventListener('click', ()=>{
        if (btn.value == 'approve'){
            let cur_video = document.querySelectorAll('video')[0]
            vid_name_cat = cur_video.src
            //split and slice to retriev the classname_categoty from the video src url
            vid_name_cat = vid_name_cat.split(':').slice(-1)[0].split('/').slice(-1)[0].split('.')[0]
            vid_file_name = vid_name_cat.split('_')[0]
            vid_category = vid_name_cat.split('_')[1]
            fetch_processs_selction_endpoint(vid_file_name, vid_category, appr_rej=btn.value);
        }
        else if(btn.value == 'reject'){
            let cur_video = document.querySelectorAll('video')[0]
            vid_name_cat = cur_video.src
            //split and slice to retriev the classname_categoty from the video src url
            vid_name_cat = vid_name_cat.split(':').slice(-1)[0].split('/').slice(-1)[0].split('.')[0]
            vid_file_name = vid_name_cat.split('_')[0]
            vid_category = vid_name_cat.split('_')[1]

            fetch_processs_selction_endpoint(vid_file_name, vid_category, appr_rej=btn.value);
        }
    });
})


btn_vid_upload.addEventListener('click', ()=>{
    div_vid_upld.classList.toggle('display-none')
})

login.addEventListener('click', ()=>{
    tm_login_form.classList.toggle('display-none');
})