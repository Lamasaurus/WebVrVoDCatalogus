var pixels_in_one_unit,pixel_text_size;
//Standard z index
var z_index = 0;
//Width of the body
var body_width;

var update_all = true;

var a_elements = new Array();

var animation_fps = 999;

//Indicates that something was dirty and all other elements should check if they changed
var somethingdirty = false;

//Special css tags
var vrcss,changing_style;
//CSS values
var invr_css = ".a-canvas{display: default;} a-scene{width: 100%; height: 100%;}", outvr_css = ".a-canvas{display: none;} a-scene{width: auto; height: auto;}";

var page_fully_loaded_event = new Event('page_fully_loaded');

//True if everything is initiated
var init_started = false;

//Container for all the transcoded elements
var a_element_container

//The element that will paly the video's
var video_element;

//The id for image assets
var img_id = 0;
var vid_id = 0;
var element_id = 0;

//The depth at which elemnts start to get placed
var layer_depth = 0;

//The section of a-frame where the image and video assets get placed
var a_assets;

var transparent;

var dynamic_add_elements = true;

//The size of the CSS refference pixel times 2
var pixels_per_meter = 200/0.26;

//the depth difference between elements
var layer_difference = 0.00001;

class Position{
    constructor(){
        this.top = 0;
        this.bottom = 0;
        this.left = 0;
        this.right = 0;
    }
}

class Element{
	constructor(domelement, depth){
		this.domelement = domelement;
		this.aelement = null;

		this.depth = depth;

        //Listenes for direct css changes
		(new MutationObserver(this.updateDirt.bind(this))).observe(this.domelement, { attributes: true, childList: true, characterData: true, subtree: false });
		(new MutationObserver(UpdateAll.bind(this))).observe(this.domelement, { attributes: true, childList: false, characterData: true, subtree: false });

        //Listenes for css animations
        this.domelement.addEventListener("animationstart", this.startAnimation.bind(this));
        this.domelement.addEventListener("animationend", this.stopAnimation.bind(this));

        //Listenes for transition changes, only works on Microsoft Edge
        this.domelement.addEventListener("transitionstart", this.startAnimation.bind(this));
        this.domelement.addEventListener("transitionend", this.stopAnimation.bind(this));

        this.position = new Position();

        //Flag for when we need to redraw
        this.dirty = true;
	}

	setId(){
		this.id = element_id++;
		this.aelement.setAttribute("id","generated_element_"+this.id);
	}

	//Returns true if attribute existes and is copyed to the aframe element
	copyAttribute(attr){
		if(this.domelement.hasAttribute(attr)){
			this.aelement.setAttribute(attr, this.domelement.getAttribute(attr));
			return true;
		}
	}

	//Adds all javascript functionality to the objects
	addFunctionality(){
		var is_clickable;
		//Some standard operations
		is_clickable = this.copyAttribute('onclick');
		is_clickable = this.copyAttribute('onmousedown') || is_clickable;
		is_clickable = this.copyAttribute('onmouseenter') || is_clickable;
		is_clickable = this.copyAttribute('onmouseleave') || is_clickable;
		is_clickable = this.copyAttribute('onmouseup') || is_clickable;

		//Video specific functionality, these overide prevously assigned func.
		if(this.domelement.hasAttribute("show-player")){
			this.aelement.setAttribute("onclick", "showVideoPlayer();");
			is_clickable = true;
		}

		if(this.domelement.hasAttribute("play-video")){
			//Video asset creation
			var asset = document.createElement("video");
			var asset_id = "vid-asset-" + vid_id++;
	        asset.setAttribute("id",asset_id);
	        asset.setAttribute("src",this.domelement.getAttribute("play-video"));
	        asset.setAttribute("preload","auto");
	        a_assets.appendChild(asset);

			this.aelement.setAttribute("onclick", "showNewVideo('"+asset_id+"');");
			is_clickable = true;
		}

		if(this.domelement.hasAttribute("hover")){

			this.aelement.hover = () => {
				this.domelement.classList.add(this.domelement.getAttribute("hover"));
			};

			this.aelement.stopHover = () => {
				this.domelement.classList.remove(this.domelement.getAttribute("hover"));
			};

			this.aelement.setAttribute("onmouseenter",  "this.hover(); " + this.aelement.getAttribute("onmouseenter"));
			this.aelement.setAttribute("onmouseleave",  "this.stopHover(); " + this.aelement.getAttribute("onmouseleave"));

			is_clickable = true;
		}

		if(is_clickable)
			this.aelement.classList.add('clickable');
	}

    startAnimation(){
        this.stopIntervall();
        this.interval = setInterval(this.updateAnimation.bind(this), 1000/animation_fps);
    }

    stopAnimation(){
        this.stopIntervall();
        this.updateAnimation();
    }

    stopIntervall(){
        clearInterval(this.interval);            
    }

    //Update for one Animation frame
    updateAnimation(){
        this.updateDirt();
        UpdateAll.bind(this).call();
    }

    setDirty(){
    	this.dirty = true;
    }

    isDirty(){
    	return this.dirty;
    }

	getAElement(){
		return this.aelement;
	}

	getDomElement(){
		return this.domelement;
	}

    updatePosition(position){
        this.position.top = position.top;
        this.position.bottom = position.bottom;
        this.position.left = position.left;
        this.position.right = position.right;
    }

    comparePosition(position){
        return this.position.top == position.top && this.position.bottom == position.bottom && this.position.left == position.left && this.position.right == position.right;
    }

    //Gets called on the object that invokes the whole update chain, which is garanteed to be dirty
    updateDirt(mutation){
    	console.log(this);
    	console.log(mutation);
        this.setDirty();
        this.update();
        somethingdirty = true;
    }

    update(){
        //get new position
        var position = this.domelement.getBoundingClientRect();

        //Check if something changed since last time, else we just stop the update
        if(this.comparePosition(position) && !this.isDirty())
            return;

        if(!this.comparePosition(position)){
	        //Cash the last position
	        this.updatePosition(position);

        	this.elementUpdatePosition();
        }

        if(this.isDirty){
	        var element_style = window.getComputedStyle(this.domelement);
	        this.elementSpecificUpdate(element_style);

	        //Set the opacity of the element
	        var new_opacity = 0;
	        if(isNotHidden(this.domelement, element_style))
	            new_opacity = parseFloat(element_style.getPropertyValue("opacity"));
	    	this.aelement.setAttribute("opacity", "");
	    	this.aelement.setAttribute("opacity", new_opacity);

	        this.dirty = false;
	    }
    }
}

//Returns if an element is visible, el.offsetParent is null if a parent is invisible but the body always has a null value with this
function isNotHidden(el, style){
	return ((el.tagName === "BODY" || el.offsetParent !== null) && style.getPropertyValue("visibility") !== "hidden" && style.getPropertyValue("display") !== "none");
}

function stripText(html){
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText;
}

class TextElement extends Element{
	constructor(domelement, depth, dontAddFunc){
		super(domelement, depth);

		this.aelement = document.createElement("a-text");
		this.update();

		this.setId();

		if(!dontAddFunc)
			this.addFunctionality();
	}

	elementUpdatePosition(){
		//Calc the y possition
        var y = -((this.position.bottom - this.position.top) / 2 + this.position.top);
        this.aelement.setAttribute("position",{x: this.position.left/pixels_per_meter, y: y/pixels_per_meter, z: z_index + this.depth});
	}

	elementSpecificUpdate(element_style){
        //Style attributes
        this.aelement.setAttribute("text","value: " + stripText(this.domelement.innerHTML) + ";");

        //We have to reset the color to a void value.
        if(transparent != element_style.getPropertyValue("color")){
			this.aelement.setAttribute('color', "");
	        this.aelement.setAttribute('color', element_style.getPropertyValue("color"));
	        this.aelement.setAttribute("visible", true);
	        this.aelement.setAttribute("side","");
	        this.aelement.setAttribute("side","double");
	    }else{
	    	this.aelement.setAttribute("visible", false);
	    }

		this.aelement.setAttribute("width",0);
        var width = (1/pixels_per_meter * parseFloat(element_style.getPropertyValue("font-size"))) * 20;
        if(width != this.aelement.getAttribute("width"))
        	this.aelement.setAttribute("width",width);

        //First reset the anchor to nothing and then back to left
		this.aelement.setAttribute("anchor","");
		this.aelement.setAttribute("anchor","left");
	}
}

class ContainerElement extends Element{
	constructor(domelement, depth, dontAddFunc){
		super(domelement, depth);

		this.aelement = document.createElement("a-plane");
		this.update();

		this.setId();

		if(!dontAddFunc)
			this.addFunctionality();
	}

	elementUpdatePosition(){
		this.width = (this.position.right - this.position.left)/pixels_per_meter;
		this.height = (this.position.bottom - this.position.top)/pixels_per_meter;

		if(this.domelement.tagName == "BODY")
			body_width = this.width;

		var y = -this.position.top/pixels_per_meter - this.height/2;

		this.aelement.setAttribute('position', {x: this.position.left/pixels_per_meter + this.width/2, y: y, z: z_index + this.depth});

		this.aelement.setAttribute("width", this.width);
		this.aelement.setAttribute("height", this.height);
	}

	elementSpecificUpdate(element_style){
		var background_color = element_style.getPropertyValue("background-color");
		this.aelement.setAttribute("visible", "");
		if(transparent != background_color){
			this.aelement.setAttribute("visible", true);
			this.aelement.setAttribute('color', background_color);
			this.aelement.setAttribute("side","");
			this.aelement.setAttribute("side","double");
		}
		else{
			this.aelement.setAttribute('color', background_color);
			this.aelement.setAttribute("visible", false);
		}
	}
}

class ImageElement extends Element{
	constructor(domelement, depth){
		super(domelement, depth);
        this.depth = depth;

		//Image asset creation
		var asset = this.domelement.cloneNode(true);
        var asset_id = "img-asset-" + img_id++;
        asset.setAttribute("id",asset_id);
        a_assets.appendChild(asset);

		this.aelement = document.createElement("a-image");
		this.aelement.setAttribute("src","#"+asset_id);

		//Initiation update
		this.update();
		this.setId();
		this.addFunctionality();
	}

	getAsset(){
		return this.asset;
	}

	elementUpdatePosition(){
		var width = (this.position.right - this.position.left)/pixels_per_meter;
		var height = (this.position.bottom - this.position.top)/pixels_per_meter;

		this.aelement.setAttribute("width", width);
		this.aelement.setAttribute("height", height);

		var y = -this.position.top/pixels_per_meter - height/2;

		this.aelement.setAttribute('position', {x: this.position.left/pixels_per_meter + width/2, y: y, z: z_index + this.depth});
	}

	elementSpecificUpdate(element_style){
	}
}

class ButtonElement extends Element{
	constructor(domelement, depth){
		super(domelement, depth);

		this.aelement = document.createElement("a-entity");
		this.aelement.setAttribute("side","double");

		//Make separate container and text element
		this.aplane = new ContainerElement(domelement, depth, true);
		this.atext = new TextElement(domelement, depth - layer_difference, true);

		//Add container and text to this entity
		this.aelement.appendChild(this.aplane.getAElement());
		this.aelement.appendChild(this.atext.getAElement());

		this.update();
		this.setId();
		this.addFunctionality();
	}

	clickElement(){
		this.domelement.click();
	}

	elementUpdatePosition(){
		this.aplane.elementUpdatePosition();
		this.atext.elementUpdatePosition();
	}

	elementSpecificUpdate(element_style){
		this.aplane.update();
		this.atext.update();
	}
}

var grabbing = false;

//Check if the event is triggered because of a grab
function IsDragEvent(element){
	if(!(element instanceof ContainerElement))
		return false;

	var dom_element = element.getDomElement();
	if(dom_element.tagName == "BODY" && dom_element.classList.contains("a-grabbing") && !grabbing){
		grabbing = true;
		return true;
	}else if(dom_element.tagName == "BODY" && !dom_element.classList.contains("a-grabbing") && grabbing){
		grabbing = false;
		return true;
	}
	return false;
}

function UpdateAll(mutations){
	//Only update when we want to update everything and something is dirty
    if(update_all && somethingdirty){

        //Stop everything from updating when dragging
        if(IsDragEvent(this))
            return;

        console.log("updateall");

    	for(var i = 0; i < a_elements.length; i++)
    		a_elements[i].update();

        somethingdirty = false;
	}
}

function AddNewElement(element){
	console.log(element);
	var new_a_element = null;

	//Some random element gets spawned and deleted immediately after, I don't see where it comes from or what its purpose is, but it gives errors. Now they don't get added
	if(element.innerHTML == '<div classname="t" onsubmit="t" onchange="t" onfocusin="t" style="margin: 0px; border: 0px; box-sizing: content-box; width: 1px; padding: 1px; display: block; zoom: 1;"><div style="width: 5px;"></div></div>')
		return;

	if(element.tagName == "BODY" || element.tagName == "DIV" || element.tagName == "SECTION" || element.tagName == "NAV" || element.tagName == "UL" || element.tagName == "LI" || element.tagName == "HEADER" || element.tagName == "FORM" || element.tagName == "INPUT"){
		new_a_element = new ContainerElement(element,layer_depth);
	}

	//Text based elements
    if(element.tagName == "P" || element.tagName == "A" || typeof element.tagName == "string" && element.tagName.startsWith("H") && parseFloat(element.tagName.split("H")[1]))
		new_a_element = new TextElement(element, layer_depth);

    //Images
    if(element.tagName == "IMG")
      new_a_element = new ImageElement(element, layer_depth);

    if(element.tagName == "BUTTON"){
    	new_a_element = new ButtonElement(element, layer_depth);

    	//Because button element takes up 2 layers we increase the layer depth here
		layer_depth += layer_difference;
    }

    //Push the element in the array of all elements
    if(new_a_element != null){
    	a_element_container.appendChild(new_a_element.getAElement());
    	a_elements.push(new_a_element);

    	layer_depth += layer_difference;
    }
}

function RemoveElement(removed_element){
	for(var i = 0; i < a_elements.length; i++){
		if(a_elements[i].getDomElement() == removed_element){
			console.log(a_elements[i]);
			a_element_container.removeChild(a_elements[i].getAElement());

			a_elements.splice(i,1);
		}
	}
}

function init(){
    THREE.ImageUtils.crossOrigin = '';

	items = new Array(document.body);
	var doc_items = document.body.getElementsByTagName("*");

	for(var i = 0; i < doc_items.length; i++)
		items.push(doc_items[i]);


	a_scene = document.createElement("a-scene");
	a_scene.setAttribute("embedded");

    //Sky
    var a_sky = document.createElement("a-gradient-sky");
    a_sky.setAttribute("material", "shader: gradient; topColor: 255 255 255; bottomColor: 10 10 10;");
    a_scene.appendChild(a_sky);

    //Assets
    a_assets = document.createElement("a-assets");
    //add demo video to assets
    a_assets.innerHTML = '<video id="iwb" src="video/city-4096-mp4-30fps-x264-ffmpeg.mp4" preload="auto"></video>';
    a_scene.appendChild(a_assets);

    //Container for all the generated elements
    a_element_container = document.createElement("a-entity");
    a_element_container.setAttribute("id", "aElementContainer");
    a_scene.appendChild(a_element_container);

    //Getting the value for this browser that means transparent
    var trans_element = document.createElement("div");
	trans_element.setAttribute("style", "background:none;display:none;")
    document.body.appendChild(trans_element);
	transparent = window.getComputedStyle(trans_element).getPropertyValue("background-color");
	document.body.removeChild(trans_element);

    //Transcode every element in the page
	for (i = 0; i < items.length; i++)
		AddNewElement(items[i]);

	//Observer to check for newly added or deleted DOM elements
	var observer = new WebKitMutationObserver(function(mutations) {
	    mutations.forEach(function(mutation) {
	    	if(dynamic_add_elements){
		        for(var i = 0; i < mutation.addedNodes.length; i++){
		            AddNewElement(mutation.addedNodes[i]);
		            somethingdirty = true;
		            UpdateAll();
		        }
		    }
	        for(var i = 0; i < mutation.removedNodes.length; i++){
	            RemoveElement(mutation.removedNodes[i]);
	            somethingdirty = true;
	            UpdateAll();
	        }
	    })
	});
	observer.observe(document.body, {childList: true});

	//Camera
	//Camera gets placed to show the page directeley, the z distance gets calculated with a/sin(A) = c/sin(C) where c is the z distance and a the body width / 2
	// A = 50° C = 40°
	camera = document.createElement("a-camera");
	camera.setAttribute("position", body_width/2 + " " + -body_width/4 + " " + ((body_width/2)*0.64278760968653932632264340990726343290755988420568179032)/0.76604444311897803520239265055541667393583245708039524585);
	camera.setAttribute("user-height", "0");
	camera.setAttribute("fov", "80");
	camera.setAttribute("far", "10000");
	camera.setAttribute("near", "0.01");
	camera.setAttribute("stereocam","eye:left;");
	camera.setAttribute("wasd-controls-enabled", "true");

	//Cursor
	cursor = document.createElement("a-cursor");
	//cursor.setAttribute("fuse",true);
	cursor.setAttribute("fuse-timeout",500);
	cursor.setAttribute("position", "0 0 -0.1");
	cursor.setAttribute("size", "0.1");
	cursor.setAttribute("color","green");
	cursor.setAttribute("geometry", "primitive: ring; radiusInner: 0.0005; radiusOuter: 0.001")
	cursor.setAttribute("raycaster","objects: .clickable; far: 90;")
	camera.appendChild(cursor);

	//Cursor animations
	/*animation1 = document.createElement("a-animation");
	animation1.setAttribute("begin","click");
	animation1.setAttribute("easing", "ease-in");
    animation1.setAttribute("dur", "150");
	animation1.setAttribute("attribute", "scale");
	animation1.setAttribute("fill", "backwards");
	animation1.setAttribute("from", "0.1 0.1 0.1");
	animation1.setAttribute("to", "1 1 1");
    animation1.setAttribute("repeat", "1");
	cursor.appendChild(animation1);

	animation2 = document.createElement("a-animation");
	animation2.setAttribute("begin","cursor-fusing");
	animation2.setAttribute("easing", "ease-in");
    animation2.setAttribute("dur", "150");
	animation2.setAttribute("attribute", "scale");
    animation2.setAttribute("direction", "alternate");
	animation2.setAttribute("fill", "forwards");
	animation2.setAttribute("from", "1 1 1");
	animation2.setAttribute("to", "0.1 0.1 0.1");
    animation2.setAttribute("repeat", "1");
	cursor.appendChild(animation2);*/

    //Inject css to get the VR button fixed
    vrcss = document.createElement('style');
    vrcss.innerHTML = ".a-enter-vr{position: fixed;} a-scene{position:fixed; top:0;}";
    document.body.appendChild(vrcss);
    changing_style = document.createElement('style');
    changing_style.innerHTML = outvr_css;
    document.body.appendChild(changing_style);

    //a_scene.setAttribute("stats", true);
    a_scene.addEventListener("enter-vr",enterVr);
    a_scene.addEventListener("exit-vr",exitVr);
	a_scene.appendChild(camera);

	video_element = new VideoElement(body_width/2 + " " + -body_width/4 + " " + ((body_width/2)*0.64278760968653932632264340990726343290755988420568179032)/0.76604444311897803520239265055541667393583245708039524585);
    a_scene.appendChild(video_element.GetElement());
    video_element.SetScource("iwb");

    document.body.appendChild(a_scene);
};

function enterVr(){
    UpdateAll();
    changing_style.innerHTML = invr_css;
}

function exitVr(){
    changing_style.innerHTML = outvr_css;
}

document.onkeydown = checkKey;

//Controls 
function checkKey(e) {

    e = e || window.event;

    //press E or A to go up and down. 
    //press P to show video
    //press T to change video representation method
    //press L to toggle moving
    //press N to stop dynamicaly adding elements
    //press O to show convas

    switch(e.keyCode){
    case 65: //press E or A to go up and down. 
    	var pos = camera.getAttribute("position");
        camera.setAttribute("position", pos.x+ " "+ (pos.y + 0.5) +" "+ pos.z);
        video_element.SetPosition(pos);
    	break;

    case 69: //press E or A to go up and down. 
        var pos = camera.getAttribute("position");
        camera.setAttribute("position", pos.x+ " "+ (pos.y - 0.5) +" "+ pos.z);
        video_element.SetPosition(pos);
        break;

    case 84: //press T to change video representation method
        video_element.ToggleMode();
        break;

    case 80: //press P to show video
    	showVideoPlayer();
    	break;

    case 76: //press L to toggle moving
    	//getAttribute for "wasd-controls-enebled" is a string
    	camera.setAttribute("wasd-controls-enabled",!(camera.getAttribute("wasd-controls-enabled") == "true"));
    	break; 

    case 78: //press N to stop dynamicaly adding elements
    	dynamic_add_elements = !dynamic_add_elements;
    	break;

    case 79: //press O to show convas
    	if(changing_style.innerHTML == invr_css)
    		changing_style.innerHTML = outvr_css;
    	else
    		changing_style.innerHTML = invr_css;
    	break;
    }
}

function showNewVideo(id){
	video_element.SetScource(id);
	showVideoPlayer();
}

function showVideoPlayer(){
	var v_element_visibility = video_element.IsVisible();
    a_element_container.setAttribute("visible", v_element_visibility);

    //Set position of the elements away from the clickable part of the world
    var position = a_element_container.getAttribute("position");
    if(v_element_visibility){
    	position.y = 0;
    	cursor.setAttribute("raycaster","objects: .clickable; far: 90;");
    }else{
		position.y = 500;
		cursor.setAttribute("raycaster","objects:; far: 90;");
    }
    a_element_container.setAttribute("position", position);

    video_element.SetVisiblity(!v_element_visibility);
}

function load(){
    if(!init_started){
        init_started = true;
        init();
    }
}

document.addEventListener("page_fully_loaded", load); 
document.dispatchEvent(page_fully_loaded_event);