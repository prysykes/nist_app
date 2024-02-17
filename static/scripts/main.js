let login = document.querySelector('#tm-login')
let tm_login_form = document.querySelector('#tm_login_form')
let btn_vid_upload = document.querySelector('#upload_videos')
let div_vid_upld = document.querySelector('#video_upload')
let cat_headings = document.querySelectorAll('.cat_headings')
let cat_name = document.querySelector('#cat_name')


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
    category = category.trim()
    let full_url_path_term = full_url_path+category
    const response =  fetch(full_url_path_term, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => console.log(data))
    // console.log('response', response);
    // const videos = response.json()
    // console.log('videos', videos );
   

}


btn_vid_upload.addEventListener('click', ()=>{
    div_vid_upld.classList.toggle('display-none')
})

login.addEventListener('click', ()=>{
    tm_login_form.classList.toggle('display-none');
})