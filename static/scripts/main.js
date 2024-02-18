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

console.log(btn_apr_rej);


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
            let cur_vid_obj_fields = cur_vid_obj['fields']
            let file_name = cur_vid_obj_fields['file_name']
            let vid_url = cur_vid_obj_fields['video']
            
            let span = document.createElement('span')
            span.innerText = file_name
            span.classList.add('vid_name')
            span.addEventListener('click', ()=>{

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

btn_apr_rej.forEach((btn)=>{
    btn.addEventListener('click', ()=>{
        if (btn.value == 'approve'){
            console.log('do approve something');
        }
        else if(btn.value == 'reject'){
            console.log('do reject something');
        }
    });
})


btn_vid_upload.addEventListener('click', ()=>{
    div_vid_upld.classList.toggle('display-none')
})

login.addEventListener('click', ()=>{
    tm_login_form.classList.toggle('display-none');
})