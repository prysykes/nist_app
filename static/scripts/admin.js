var user_processed_categories = document.querySelectorAll('.user-processed-categories')
var video_categories = document.querySelectorAll('.video_categories')
btn_accept_videos = document.querySelectorAll('.btn_accept_videos')



video_categories.forEach((cat_elem)=>{
    let approve_video_fetch_promise = null
    cat_elem.addEventListener('mouseover', (e)=>{
        
        
        let child_node = cat_elem.childNodes
        let cur_h3 = child_node[1]
        let annotator = cur_h3.innerText.split(' - ')[1]
       
        
        let approve_all_videos_btn = cur_h3.childNodes[1]
        approve_all_videos_btn.classList.remove('display-none')
        
        approve_all_videos_btn.addEventListener('click', (event)=>{
            
    
            // admin_approve
            let user_categories_div = approve_all_videos_btn.parentNode.parentNode
            let user_categories_lis =  user_categories_div.childNodes[3].children
            let li_array = Array.from(user_categories_lis )

            let set_of_categories = new Set()
            li_array.forEach((li_ele)=>{
                let category_text_value = li_ele.innerText
                set_of_categories.add(category_text_value)
                
                
            })
            let set_of_categories_array = Array.from(set_of_categories)
            let set_of_categories_array_str = set_of_categories_array.join('-')
            let full_load = annotator+"-"+set_of_categories_array_str

            // user_assoc_category[annotator] = set_of_categories_array

            let endpoint = `${root_url}/admin_approve?user_catergories=${full_load}`
            //fff

            if (!approve_video_fetch_promise) {
                approve_video_fetch_promise = fetch(endpoint, {
                    method: 'GET'
                })
                .then(approve_video_fetch_promise => approve_video_fetch_promise.json())
                .then((data)=>{
                    console.log(data);
                    
                    
                })
            }
            
            
            //fff
            
        })

        // add the fetch call to approve all videos from a user
        
        
    })

    cat_elem.addEventListener('mouseout', (e)=>{
        approve_video_fetch_promise = null
        let child_node = cat_elem.childNodes
        let cur_h3 = child_node[1]
        let approve_all_videos_btn = cur_h3.childNodes[1]
        approve_all_videos_btn.classList.add('display-none')
        
        
    })
    
})




const root_url = window.location.origin
const VIDEO_TYPE_ = "video/webm"


function create_video_element(){
    let video = document.createElement('video')
    video.width = 600
    video.height = 500
    video.setAttribute("controls", "controls")
    video.type = VIDEO_TYPE_

    return video
}

function create_ul_elements_with_videos(response_data){
    // console.log("response_data", response_data);
    // check if the ul element is already create, else create it
    let ul_elem = document.getElementById('admin_vdeo_ul')

    if (ul_elem == null) {
        ul_elem = document.createElement('ul')
        ul_elem.id = 'admin_vdeo_ul'
    }else{
        ul_elem.innerHTML = ""
    }
        
    for (const [key, value] of Object.entries(response_data)){
        file_name = value['fields']['file_name']
        keywords = value['fields']['keywords']
        video = value['fields']['video']
        // console.log(file_name, keywords, video);
        

        let li_elem = document.createElement('li')
        let span_elem = document.createElement('span')
        span_elem.innerText = video
        span_elem.id = file_name
        span_elem.classList.add('display-none')  
        li_elem.innerText = file_name  
        li_elem.appendChild(span_elem)
        

        // console.log(li_elem);
        
        li_elem.addEventListener('click', (e) => { 
            
            let target_element = e.target
            
            let cur_span_elem = target_element.childNodes[1]
            let video_player = document.getElementById('video_player')
            video_player.innerHTML = ""

            let video_url = cur_span_elem.innerText
            let full_video_url = "media"+"/"+video_url
            let video_tag = create_video_element()

            video_tag.src = full_video_url 
            video_player.appendChild(video_tag)
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
        category_text = category.innerText
        
        // select h3 element that holds the user name
        let h3_elem_text = category.parentElement.parentElement.firstElementChild.innerText
        let annotator = h3_elem_text.trim().split(' - ')[1].split(" ")[0]
        
        
        let get_category_endpoint = `${root_url}/display_videos?category=${category_text}&annotator=${annotator}`
        

        response = fetch(get_category_endpoint, {
            method: 'GET'
        })
        .then(response => response.json())
        .then((data)=>{
            let video_list_admin = document.querySelector('#video_list_admin')

            ul_elem = create_ul_elements_with_videos(response_data=data)
            video_list_admin.appendChild(ul_elem)
            
        })
    })
})