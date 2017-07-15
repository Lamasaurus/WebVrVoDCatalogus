//Loggs when true
var debugging = true;

//Amount of frames per second that animations should be updated with
var animation_fps = 30;

//The size of the CSS refference pixel times 2
var pixels_per_meter = 200/0.26;

//the depth difference between elements
var layer_difference = 0.00001;

var dom2aframe;
var asset_manager;

//Log item when we want to debug
function log(item){
	if(debugging)
		console.log(item);
}

class Dom2Aframe{

	constructor(){
	    THREE.ImageUtils.crossOrigin = '';
	    //All the elements that represent dom elements
		this.a_elements = new Array();
		//The depth at which elemnts start to get placed
		this.layer_depth = 0;
		//We dynamicaly add elements that get added to the dom to our a-scene aswell, this should be turned off when using the A-frame inspector 
		this.dynamic_add_elements = true;

	    //The a-scene that will contain all A-frame code
		this.a_scene = document.createElement("a-scene");
		//Set embedded so it can be part of the dom page
		this.a_scene.setAttribute("embedded");

	    //Append assets
	    this.a_scene.appendChild(asset_manager.getAElement());

	    //Container for all the transcoded elements
	    this.a_element_container = document.createElement("a-entity");
	    this.a_element_container.setAttribute("id", "aElementContainer");
	    this.a_scene.appendChild(this.a_element_container);

		//Calculate the with of the body, this is used to calculate the camera position
		var body_position = document.body.getBoundingClientRect();
		var body_width = (body_position.right - body_position.left)/pixels_per_meter;

		//Camera
		this.camera = new Camera(body_width);
		this.a_scene.appendChild(this.camera.getAElement());

		this.calcTransparentValue();
	    this.initStyles();
	    this.initEvents();
		this.initControllerSupport();
		this.initVideoElement(body_width);
		this.initSky();

	    if(debugging)
	    	this.a_scene.setAttribute("stats", true);

	    //Append the a-scene to the body
	    document.body.appendChild(this.a_scene);

	    //Indicates that something was dirty and all other elements should check if they changed
		this.somethingdirty = false;

	    //Start render loop
	    window.requestAnimationFrame(this.UpdateAll.bind(this));
	}

	//The style values for a transparent dom element
	//This can be different between browsers, that is why we should calculate it everytime we load the page
	calcTransparentValue(){
		//Getting the value for this browser that means transparent to know when an element is transparent
	    var trans_element = document.createElement("div");
		trans_element.setAttribute("style", "background:none;display:none;")
		//Add the element to the body because only then we can caluculate the style
	    document.body.appendChild(trans_element);
		this.transparent = window.getComputedStyle(trans_element).getPropertyValue("background-color");
		//Remove it again
		document.body.removeChild(trans_element);
	}

	initSky(){
		var a_sky = document.createElement("a-gradient-sky");
	    a_sky.setAttribute("material", "shader: gradient; topColor: 255 255 255; bottomColor: 10 10 10;");
	    this.a_scene.appendChild(a_sky);
	}

	initVideoElement(body_width){
		this.video_element = new VideoElement({x:body_width/2, y:-body_width/4, z:this.camera.getCameraDistance()});
	    this.a_scene.appendChild(this.video_element.GetElement());
	    this.video_element.SetScource("iwb");
	}

	initControllerSupport(){
		var controller_support = document.createElement("a-entity");
		controller_support.setAttribute("laser-controls");
		this.a_scene.appendChild(controller_support);
	}

	initEvents(){
		//Observer to check for newly added or deleted DOM elements
		var observer = new MutationObserver(this.HandleRemoveAddMutation.bind(this));
		observer.observe(document.body, {childList: true});

		//Events for when we enter and exit vr
		this.a_scene.addEventListener("enter-vr",this.enterVr.bind(this));
	    this.a_scene.addEventListener("exit-vr",this.exitVr.bind(this));
	}

	initStyles(){
		//Inject css to get the VR button fixed and the a-scene on top of everything
	    this.vrcss = document.createElement('style');
	    this.vrcss.innerHTML = ".a-enter-vr{position: fixed;} a-scene{position:fixed; top:0;}";
	    document.body.appendChild(this.vrcss);

	    //Style that changes when in vr
		this.invr_css = ".a-canvas{display: default;} a-scene{width: 100%; height: 100%;} *{user-select: none;}";
		this.outvr_css = ".a-canvas{display: none;} a-scene{width: auto; height: auto;}";
	    this.changing_style = document.createElement('style');
	    this.changing_style.innerHTML = this.outvr_css;
	    document.body.appendChild(this.changing_style);
	}

	//Looks at all the elements and updates them if they are dirty
	UpdateAll(){
		//Only update when something is dirty
	    if(this.somethingdirty){
	        log("Updating all Elements");

	    	for(var i = 0; i < this.a_elements.length; i++)
	    		this.a_elements[i].update();

	        this.somethingdirty = false;
		}

		//Loop back
		window.requestAnimationFrame(this.UpdateAll.bind(this));
	}

	AddNewElement(element){
		log("New element:")
		log(element);
		var new_a_element = null;

		//Some random element gets spawned and deleted immediately after, I don't see where it comes from or what its purpose is, but it gives errors. Now they don't get added
		if(element.innerHTML == '<div classname="t" onsubmit="t" onchange="t" onfocusin="t" style="margin: 0px; border: 0px; box-sizing: content-box; width: 1px; padding: 1px; display: block; zoom: 1;"><div style="width: 5px;"></div></div>')
			return;

		//Container element
		if(element.tagName == "BODY" || element.tagName == "DIV" || element.tagName == "SECTION" || element.tagName == "NAV" || element.tagName == "UL" || element.tagName == "LI" || element.tagName == "HEADER" || element.tagName == "FORM" || element.tagName == "INPUT" || element.tagName == "ARTICLE")
			new_a_element = new ContainerElement(element,this.layer_depth);

		//Text based elements
	    if(element.tagName == "P" || element.tagName == "A" || element.tagName == "BUTTON" || element.tagName == "SPAN" || typeof element.tagName == "string" && element.tagName.startsWith("H") && parseFloat(element.tagName.split("H")[1])){
	    	new_a_element = new TextWithBackgroundElement(element, this.layer_depth);
	    	//Because this element takes up 2 layers we increase the layer depth here
			this.layer_depth += layer_difference;
	    }
	    
	    //Images
	    if(element.tagName == "IMG")
	      new_a_element = new ImageElement(element, this.layer_depth);

	    //Push the element in the array of all elements
	    if(new_a_element != null){
	    	this.a_element_container.appendChild(new_a_element.getAElement());
	    	this.a_elements.push(new_a_element);

	    	this.layer_depth += layer_difference;
	    }
	}

	//Seeks and removes an element
	RemoveElement(removed_element){
		for(var i = 0; i < this.a_elements.length; i++){
			if(this.a_elements[i].getDomElement() == removed_element){
				log("Element removed:");
				log(this.a_elements[i]);
				this.a_element_container.removeChild(this.a_elements[i].getAElement());

				this.a_elements.splice(i,1);
			}
		}
	}

	//Adds the element and then recursively calls this function on its direct children
	AddNewNestedElement(element){
		this.AddNewElement(element);

		var children = element.childNodes;
		if(children.length < 2)
			return;

		for(var i = 0; i < children.length; i++)
			this.AddNewNestedElement(children[i]);
	}

	HandleRemoveAddMutation(mutations) {
	    mutations.forEach(function(mutation) {
	    	if(dom2aframe.dynamic_add_elements){
		        for(var i = 0; i < mutation.addedNodes.length; i++){
		            dom2aframe.AddNewNestedElement(mutation.addedNodes[i]);
		            dom2aframe.somethingdirty = true;
		        }
		    }
	        for(var i = 0; i < mutation.removedNodes.length; i++){
	            dom2aframe.RemoveElement(mutation.removedNodes[i]);
	            dom2aframe.somethingdirty = true;
	        }
	    })
	}

	//Creates an element for every dom element that is present in the body and the body itself
	createAllElements(){
		//Get all elements that exist in the body
		var items = new Array(document.body);
		var doc_items = document.body.getElementsByTagName("*");
		for(var i = 0; i < doc_items.length; i++)
			items.push(doc_items[i]);

	    //Transcode every element in the page
		for (i = 0; i < items.length; i++)
			this.AddNewElement(items[i]);
	}

	enterVr(){
	    this.changing_style.innerHTML = this.invr_css;
	}

	exitVr(){
	    this.changing_style.innerHTML = this.outvr_css;
	}

	//Controls 
	checkKey(e) {

	    e = e || window.event;

	    //press E or A to go up and down. 
	    //press P to show video
	    //press T to change video representation method
	    //press L to toggle moving
	    //press N to stop dynamicaly adding elements
	    //press O to show convas
	    //press Ctrl + Alt + I to inspect

	    switch(e.keyCode){
	    case 65: //press E or A to go up and down. 
	    	var pos = this.camera.getPosition();
	        this.camera.setPosition({x:pos.x, y:(pos.y + 0.5), z: pos.z});
	        this.video_element.SetPosition(pos);
	    	break;

	    case 69: //press E or A to go up and down. 
	        var pos = this.camera.getPosition();
	        this.camera.setPosition({x:pos.x, y:(pos.y - 0.5), z: pos.z});
	        this.video_element.SetPosition(pos);
	        break;

	    case 84: //press T to change video representation method
	        this.video_element.ToggleMode();
	        break;

	    case 80: //press P to show video
	    	this.showVideoPlayer();
	    	break;

	    case 76: //press L to toggle moving
	    	//getAttribute for "wasd-controls-enebled" is a string
	    	this.camera.setMovable(this.camera.isMovable());
	    	break; 

	    case 78: //press N to stop dynamicaly adding elements
	    	this.dynamic_add_elements = !this.dynamic_add_elements;
	    	break;

	    case 79: //press O to show convas. This is done by changing the style of the canvas and a-scene
	    	if(this.changing_style.innerHTML == this.invr_css)
	    		this.changing_style.innerHTML = this.outvr_css;
	    	else
	    		this.changing_style.innerHTML = this.invr_css;
	    	break;

	    case 73: //press Ctrl + Alt + I to inspect
	    	this.dynamic_add_elements = false;
	    	this.changing_style.innerHTML = this.invr_css;
	    	break;
	    }
	}

	//Switches to a new video source and then shows the player
	showNewVideo(id){
		this.video_element.SetScource(id);
		this.showVideoPlayer();
	}

	//Toggle the media player
	showVideoPlayer(){
		var v_element_visibility = this.video_element.IsVisible();

	    this.video_element.SetVisiblity(!v_element_visibility);
	    this.a_element_container.setAttribute("visible", v_element_visibility);

	    //Set position of the elements away from the clickable part of the world
	    var position = this.a_element_container.getAttribute("position");
	    if(v_element_visibility){
	    	position = {x : position.x, y : position.y+1000, z : position.z};
	    	this.camera.setClickableClasses(".clickable");
	    }else{
			position = {x : position.x, y : position.y-1000, z : position.z};
			this.camera.clearClickableClasses();
	    }

	    //Set the position
	    this.a_element_container.setAttribute("position", "");
	    this.a_element_container.setAttribute("position", position);
	}
}

//True if everything is initiating
var init_started = false;
//Function to start loading dom2aframe
function load(){
    if(!init_started){
        init_started = true;

        //AssetManager
        asset_manager = new AssetManager();

        dom2aframe = new Dom2Aframe();
        dom2aframe.createAllElements();
        
        document.onkeydown = dom2aframe.checkKey.bind(dom2aframe);
    }
}

document.addEventListener("page_fully_loaded", load); 
//document.dispatchEvent(new Event('page_fully_loaded'));