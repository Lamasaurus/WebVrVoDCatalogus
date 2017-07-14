//Loggs when true
var debugging = true;

//Standard z index
var z_index = 0;

//Width of the body
var body_width;

//All the elements that represent dom elements
var a_elements = new Array();

//Amount of frames per second that animations should be updated with
var animation_fps = 30;

//Indicates that something was dirty and all other elements should check if they changed
var somethingdirty = false;

//Special css tags
var vrcss,changing_style;
//CSS values
var invr_css = ".a-canvas{display: default;} a-scene{width: 100%; height: 100%;} *{user-select: none;}", outvr_css = ".a-canvas{display: none;} a-scene{width: auto; height: auto;}";

//Event that signals that we can start loading
var page_fully_loaded_event = new Event('page_fully_loaded');

//True if everything is initiated
var init_started = false;

//Container for all the transcoded elements
var a_element_container

//The element that will paly the video's
var video_element;

//The id for assets and elements
var asset_id = 0;
var element_id = 0;

//The depth at which elemnts start to get placed
var layer_depth = 0;

//The section of a-frame where the image and video assets get placed
var a_assets;

//The style values for a transparent dom element
//This can be different between browsers, that is why we should calculate it everytime we load the page
var transparent;

//We dynamicaly add elements that get added to the dom to our a-scene aswell, this should be turned off when using the A-frame inspector 
var dynamic_add_elements = true;

//The size of the CSS refference pixel times 2
var pixels_per_meter = 200/0.26;

//the depth difference between elements
var layer_difference = 0.00001;

function log(item){
	if(debugging)
		console.log(item);
}

//Class to represent a position
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
		//Make sure dom elements can tell theyr children to update
		this.domelement.setSubtreeDirty = () => { this.setSubtreeDirty(); };
		this.aelement = null;

		this.depth = depth;

        //Listenes for direct css changes
		(new MutationObserver(this.updateDirt.bind(this))).observe(this.domelement, { attributes: true, childList: true, characterData: true, subtree: false, attributeOldValue : true });
		//(new MutationObserver(UpdateAll)).observe(this.domelement, { attributes: true, childList: false, characterData: true, subtree: false, attributeOldValue : true });

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

	//Sets the id of the element
	setId(){
		this.id = element_id++;
		this.aelement.setAttribute("id","generated_element_"+this.id);
		this.aelement.domelement = this.domelement;
	}

	//Returns true if attribute existes and the functionality can be used
	copyAttribute(attr){
		if(this.domelement.hasAttribute(attr)){
			this.aelement[attr] = this.domelement[attr].bind(this.domelement);
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

		//Video specific functionality

		//The show-player attribute shows the media player when the element is clicked
		if(this.domelement.hasAttribute("show-player")){
			this.aelement.onclick = function(){ showVideoPlayer(); if(this.domelement.onclick) this.domelement.onclick.call(this.domelement); }
			is_clickable = true;
		}

		//The play-video attribute shows the media player with a new video, that is specified by the attribute, when the element is clicked
		if(this.domelement.hasAttribute("play-video")){
			//Create video asset
			var video_id = GetAsset(this.domelement.getAttribute("play-video"), "video");
			this.aelement.onclick = function(){ showNewVideo(video_id); if(this.domelement.onclick) this.domelement.onclick.call(this.domelement); }
			is_clickable = true;
		}

		//The hover attribute adds the class that is specified in the attribute to the element when the cursor enters it and removes it when the cursor leves
		if(this.domelement.hasAttribute("hover")){

			this.aelement.hover = function() {
				//The class gets added to the dom element
				this.domelement.classList.add(this.domelement.getAttribute("hover"));
			};

			this.aelement.stopHover = function() {
				//The class gets removed from the dom element
				this.domelement.classList.remove(this.domelement.getAttribute("hover"));
			};

			this.aelement.onmouseenter = ()=>{ this.aelement.hover(); if(this.domelement.onmouseenter) this.domelement.onmouseenter.call(this.domelement); };
			this.aelement.onmouseleave = ()=>{ this.aelement.stopHover(); if(this.domelement.onmouseleave) this.domelement.onmouseleave.call(this.domelement); };

			is_clickable = true;
		}

		if(is_clickable)
			this.aelement.classList.add('clickable');
	}

	//At the start of an animation, we want to start an interval to update this element every so often
    startAnimation(event){
    	//Stop the event from propagating to parent elements
    	event.stopPropagation();
    	log("Animation started");

        this.stopIntervall();
        this.updateAnimation();
        this.interval = setInterval(this.updateAnimation.bind(this), 1000/animation_fps);
    }

    //Stop the animation and update one last time
    stopAnimation(event){
    	//Stop the event from propagating to parent elements
    	event.stopPropagation();
    	log("Animation stopt");

        this.stopIntervall();
        this.updateAnimation();
    }

    //Stop the interval to update for an animation
    stopIntervall(){
        clearInterval(this.interval);            
    }

    //Update for one Animation frame
    updateAnimation(){
        this.setSubtreeDirty();
    }

    //Flaggs itself as dirty and recursively sets its direct children dirty
    setSubtreeDirty(){
    	this.setDirty();

    	var children = this.domelement.childNodes;
		for(var i = 0, len = children.length; i < len; i++)
			if(children[i].setSubtreeDirty)
				children[i].setSubtreeDirty();
    }

    //Sets the element dirty and flaggs that there is something dirty
    setDirty(){
    	this.dirty = true;
    	somethingdirty = true;
    }

    isDirty(){
    	return this.dirty;
    }

    //Return the A-frame element
	getAElement(){
		return this.aelement;
	}

	//Return the dom element 
	getDomElement(){
		return this.domelement;
	}

	//Opdate to the new position
    updatePosition(position){
        this.position.top = position.top;
        this.position.bottom = position.bottom;
        this.position.left = position.left;
        this.position.right = position.right;
    }

    //Compares the position with its own position, returns true if they are the same
    comparePosition(position){
        return this.position.top == position.top && this.position.bottom == position.bottom && this.position.left == position.left && this.position.right == position.right;
    }

    //Checks if the element should be flagged as dirty and if its children also should be flagged
    updateDirt(mutation, is_animating){
    	if(SetDragEvent(this) || !mutation)
    		return;

    	for(var i = 0; i < mutation.length; i++){
	    	//Check if the element just stayed the same as before
	        if(mutation[i].oldValue === this.domelement.getAttribute(mutation[i].attributeName))
	        	continue;

	        log("Mutated element:")
	    	log(this);
	    	log("Mutation:")
	    	log(mutation[i]);

	    	//Check if the elements style and possibly the style of its children changed
	        if(mutation[i].type === "attributes" && (mutation[i].attributeName === "class" || mutation[i].attributeName === "style"))
	        	this.setSubtreeDirty();
	        else
	        	this.setDirty();

	        //this.update();
	    }
    }

    //Generic update function
    update(){
        //get new position
        var position = this.domelement.getBoundingClientRect();

        //Check if something changed since last time, else we just stop the update
        if(this.comparePosition(position) && !this.isDirty())
            return;

        //Check if the postition was updated
        if(!this.comparePosition(position)){
	        //Cash the new position
	        this.updatePosition(position);
	        //Let the element update its own position
        	this.elementUpdatePosition();
        }

        //Check if the element was flagged as dirty, this only happens when it's style may have changed
        if(this.isDirty){
        	//Get the style of the elemtent, this is a heavy operation
	        var element_style = window.getComputedStyle(this.domelement);

	        //Let the element update its own style
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

//Check if string s is a url
function isUrl(s) {
   var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
   return regexp.test(s);
}

//Strips all tags from a string
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
		//Calc the x and y possition
        var y = -((this.position.bottom - this.position.top) / 2 + this.position.top)/pixels_per_meter;
        var x = this.position.left/pixels_per_meter;

        this.aelement.setAttribute("position",{x: x, y: y, z: z_index + this.depth});
	}

	elementSpecificUpdate(element_style){
        //Get the text value of the element
        this.aelement.setAttribute("text","value: " + stripText(this.domelement.innerHTML) + ";");

        if(transparent != element_style.getPropertyValue("color")){
			this.aelement.setAttribute('color', "");
	        this.aelement.setAttribute('color', element_style.getPropertyValue("color"));

	        this.aelement.setAttribute("visible", true);

	        this.aelement.setAttribute("side","");
	        this.aelement.setAttribute("side","double");
	    }else{ //If the element is transparent we just don't show it
	    	this.aelement.setAttribute("visible", false);
	    }

		this.aelement.setAttribute("width",0);
		//The width of the text element determins the size of the text, so we have to convert font-size to width
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

		//Save the with of the body, this is used to calculate the camera position
		if(this.domelement.tagName == "BODY")
			body_width = this.width;

		//Calculate y and x position
		var y = -this.position.top/pixels_per_meter - this.height/2;
		var x = this.position.left/pixels_per_meter + this.width/2;

		this.aelement.setAttribute('position', {x: x, y: y, z: z_index + this.depth});

		this.aelement.setAttribute("width", this.width);
		this.aelement.setAttribute("height", this.height);
	}

	elementSpecificUpdate(element_style){
		var background_color = element_style.getPropertyValue("background-color");
		//Get the background image
		var background_image = element_style.getPropertyValue("background-image");
		//Juse a regex to extract the url if it is there
		background_image = background_image.substring(background_image.lastIndexOf('(\"')+2,background_image.lastIndexOf('\")'));
		//If the background image is just "n" it means that there  was none
		if(background_image === "n")
			background_image = false;

		this.aelement.setAttribute("visible", "");
	
		if(transparent != background_color || background_image){ //Check if the element is not transparent or has a background image
			this.aelement.setAttribute("visible", true);

			if(isUrl(background_image)){//Check if the path to the background image is a legitimate url
				this.aelement.setAttribute('material','');
				//Set the source to the right asset id and alphaTest on 0.5, this makes that if a PNG uses alpha, that alpha is respected and not just white
				this.aelement.setAttribute('material','alphaTest: 0.5; src: #' + GetAsset(background_image, "img"));
			} else //If the background just is a color
				this.aelement.setAttribute('color', background_color);

			//Set double sided so we can look at the element from behind
			this.aelement.setAttribute("side","");
			this.aelement.setAttribute("side","double");
		}else{ //If the element is transparent we just don't show it
			this.aelement.setAttribute("visible", false);
		}
	}
}

//Gives back the id of the asset or makes a new asset
function GetAsset(path, type){
	var assets = a_assets.getChildren();
	//Check there already is an asset entry for this path
	for(var i = 0; i < assets.length; i++)
		if(assets[i].getAttribute("src") === path)
			return assets[i].getAttribute("id");

	//Create a new asset entry if it did not exist yet
	var asset = document.createElement(type);
	asset.setAttribute("src",path);
	//Asset id
    var id = "asset-" + asset_id++;
    asset.setAttribute("id", id);
    a_assets.appendChild(asset);

    return id;
}

//Image elements represent img dom elements
class ImageElement extends Element{
	constructor(domelement, depth){
		super(domelement, depth);
        this.depth = depth;

		this.aelement = document.createElement("a-image");
		//Set the source of the element, this is the id  of the image element in the a-asset tag
		this.aelement.setAttribute("src","#"+GetAsset(this.domelement.getAttribute("src"),"img"));
		//Set alphaTest on 0.5, this makes that if a PNG uses alpha, that alpha is respected and not just white
		this.aelement.setAttribute("material","alphaTest: 0.5");

		//Initiation update
		this.update();
		this.setId();
		this.addFunctionality();
	}

	getAsset(){
		return this.asset;
	}

	elementUpdatePosition(){
		//Calc with and height of the element
		var width = (this.position.right - this.position.left)/pixels_per_meter;
		var height = (this.position.bottom - this.position.top)/pixels_per_meter;

		this.aelement.setAttribute("width", width);
		this.aelement.setAttribute("height", height);

		//Calculate the y position
		var y = -this.position.top/pixels_per_meter - height/2;
		//Calculate the x position
		var x = this.position.left/pixels_per_meter + width/2;

		this.aelement.setAttribute('position', {x: x, y: y, z: z_index + this.depth});
	}

	elementSpecificUpdate(element_style){
		this.aelement.setAttribute("src","#"+GetAsset(this.domelement.getAttribute("src"),"img"));
	}
}

//Text with background represents every element that contains pure text
class TextWithBackgroundElement extends Element{
	constructor(domelement, depth){
		super(domelement, depth);

		this.aelement = document.createElement("a-entity");
		this.aelement.setAttribute("side","double");

		//Make separate container and text element
		this.aplane = new ContainerElement(domelement, depth);
		this.atext = new TextElement(domelement, depth - layer_difference, true);

		//Because this element takes up 2 layers we increase the layer depth here
		layer_depth += layer_difference;

		//Add container and text to this entity
		this.aelement.appendChild(this.aplane.getAElement());
		this.aelement.appendChild(this.atext.getAElement());

		this.update();
		this.setId();
		//this.addFunctionality();
	}

	//Text with background is dirty when it or its children is dirty
	isDirty(){
		return this.aplane.isDirty() || this.atext.isDirty() || this.isdirty;
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
function SetDragEvent(element){
	//Only the body can be grabed, this is a container element
	if(!(element instanceof ContainerElement))
		return false;

	var dom_element = element.getDomElement();
	if(dom_element.tagName === "BODY" && dom_element.classList.contains("a-grabbing") && !grabbing){ //If we are not grabbing and the class a-grabbing appears in the body we know we started grabbing
		grabbing = true;
		return true;
	}else if(dom_element.tagName === "BODY" && !dom_element.classList.contains("a-grabbing") && grabbing){ //If we are grabbing and the a-grabbing class is gone, we know it is over, but we still have ignore the event
		grabbing = false;
		return true;
	}
	return false;
}

//Looks at all the elements and updates them if they are dirty
function UpdateAll(){
	//Only update when something is dirty
    if(somethingdirty){
        log("Updating all Elements");

    	for(var i = 0; i < a_elements.length; i++)
    		a_elements[i].update();

        somethingdirty = false;
	}

	//Loop back
	window.requestAnimationFrame(UpdateAll);
}

function AddNewElement(element){
	log("New element:")
	log(element);
	var new_a_element = null;

	//Some random element gets spawned and deleted immediately after, I don't see where it comes from or what its purpose is, but it gives errors. Now they don't get added
	if(element.innerHTML == '<div classname="t" onsubmit="t" onchange="t" onfocusin="t" style="margin: 0px; border: 0px; box-sizing: content-box; width: 1px; padding: 1px; display: block; zoom: 1;"><div style="width: 5px;"></div></div>')
		return;

	//Container element
	if(element.tagName == "BODY" || element.tagName == "DIV" || element.tagName == "SECTION" || element.tagName == "NAV" || element.tagName == "UL" || element.tagName == "LI" || element.tagName == "HEADER" || element.tagName == "FORM" || element.tagName == "INPUT" || element.tagName == "ARTICLE")
		new_a_element = new ContainerElement(element,layer_depth);

	//Text based elements
    if(element.tagName == "P" || element.tagName == "A" || element.tagName == "BUTTON" || element.tagName == "SPAN" || typeof element.tagName == "string" && element.tagName.startsWith("H") && parseFloat(element.tagName.split("H")[1]))
    	new_a_element = new TextWithBackgroundElement(element, layer_depth);
    
    //Images
    if(element.tagName == "IMG")
      new_a_element = new ImageElement(element, layer_depth);

    //Push the element in the array of all elements
    if(new_a_element != null){
    	a_element_container.appendChild(new_a_element.getAElement());
    	a_elements.push(new_a_element);

    	layer_depth += layer_difference;
    }
}

//Seeks and removes an element
function RemoveElement(removed_element){
	for(var i = 0; i < a_elements.length; i++){
		if(a_elements[i].getDomElement() == removed_element){
			log("Element removed:");
			log(a_elements[i]);
			a_element_container.removeChild(a_elements[i].getAElement());

			a_elements.splice(i,1);
		}
	}
}

//Adds the element and then recursively calls this function on its direct children
function AddNewNestedElement(element){
	AddNewElement(element);

	var children = element.childNodes;
	if(children.length < 2)
		return;

	for(var i = 0; i < children.length; i++)
		AddNewNestedElement(children[i]);
}

function init(){
    THREE.ImageUtils.crossOrigin = '';

	a_scene = document.createElement("a-scene");
	a_scene.setAttribute("embedded");

    //Sky
    var a_sky = document.createElement("a-gradient-sky");
    a_sky.setAttribute("material", "shader: gradient; topColor: 255 255 255; bottomColor: 10 10 10;");
    a_scene.appendChild(a_sky);

    //Assets
    a_assets = document.createElement("a-assets");
    //Add demo video to assets
    a_assets.innerHTML = '<video id="iwb" src="video/city-4096-mp4-30fps-x264-ffmpeg.mp4" preload="auto"></video>';
    a_scene.appendChild(a_assets);

    //Container for all the generated elements
    a_element_container = document.createElement("a-entity");
    a_element_container.setAttribute("id", "aElementContainer");
    a_scene.appendChild(a_element_container);

    //Getting the value for this browser that means transparent to know when an element is transparent
    var trans_element = document.createElement("div");
	trans_element.setAttribute("style", "background:none;display:none;")
	//Add the element to the body because only then we can caluculate the style
    document.body.appendChild(trans_element);
	transparent = window.getComputedStyle(trans_element).getPropertyValue("background-color");
	//Remove it again
	document.body.removeChild(trans_element);

	//Get all elements that exist in the body
	items = new Array(document.body);
	var doc_items = document.body.getElementsByTagName("*");

	for(var i = 0; i < doc_items.length; i++)
		items.push(doc_items[i]);

    //Transcode every element in the page
	for (i = 0; i < items.length; i++)
		AddNewElement(items[i]);

	//Observer to check for newly added or deleted DOM elements
	var observer = new MutationObserver(function(mutations) {
	    mutations.forEach(function(mutation) {
	    	if(dynamic_add_elements){
		        for(var i = 0; i < mutation.addedNodes.length; i++){
		            AddNewNestedElement(mutation.addedNodes[i]);
		            somethingdirty = true;
		        }
		    }
	        for(var i = 0; i < mutation.removedNodes.length; i++){
	            RemoveElement(mutation.removedNodes[i]);
	            somethingdirty = true;
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
	a_scene.appendChild(camera);

	//Cursor animations, triggers an animation and thus updateall. Thats why it is in comments
	/*click_animation = document.createElement("a-animation");
	click_animation.setAttribute("begin","click");
	click_animation.setAttribute("easing", "ease-in");
    click_animation.setAttribute("dur", "150");
	click_animation.setAttribute("attribute", "scale");
	click_animation.setAttribute("fill", "backwards");
	click_animation.setAttribute("from", "0.1 0.1 0.1");
	click_animation.setAttribute("to", "1 1 1");
    click_animation.setAttribute("repeat", "1");
	cursor.appendChild(click_animation);

	fuse_animation = document.createElement("a-animation");
	fuse_animation.setAttribute("begin","cursor-fusing");
	fuse_animation.setAttribute("easing", "ease-in");
    fuse_animation.setAttribute("dur", "150");
	fuse_animation.setAttribute("attribute", "scale");
    fuse_animation.setAttribute("direction", "alternate");
	fuse_animation.setAttribute("fill", "forwards");
	fuse_animation.setAttribute("from", "1 1 1");
	fuse_animation.setAttribute("to", "0.1 0.1 0.1");
    fuse_animation.setAttribute("repeat", "1");
	cursor.appendChild(fuse_animation);*/

    //Inject css to get the VR button fixed and the a-scene on top of everything
    vrcss = document.createElement('style');
    vrcss.innerHTML = ".a-enter-vr{position: fixed;} a-scene{position:fixed; top:0;}";
    document.body.appendChild(vrcss);

    //Style that changes when in vr
    changing_style = document.createElement('style');
    changing_style.innerHTML = outvr_css;
    document.body.appendChild(changing_style);

    //a_scene.setAttribute("stats", true);
    a_scene.addEventListener("enter-vr",enterVr);
    a_scene.addEventListener("exit-vr",exitVr);

	//Controller support
	var controller_support = document.createElement("a-entity");
	controller_support.setAttribute("laser-controls");
	a_scene.appendChild(controller_support);

	//Create the video bundle
	video_element = new VideoElement(body_width/2 + " " + -body_width/4 + " " + ((body_width/2)*0.64278760968653932632264340990726343290755988420568179032)/0.76604444311897803520239265055541667393583245708039524585);
    a_scene.appendChild(video_element.GetElement());
    video_element.SetScource("iwb");

    document.body.appendChild(a_scene);

    //Start render loop
    window.requestAnimationFrame(UpdateAll);
};

function enterVr(){
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
    //press Ctrl + Alt + I to inspect

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

    case 79: //press O to show convas. This is done by changing the style of the canvas and a-scene
    	if(changing_style.innerHTML == invr_css)
    		changing_style.innerHTML = outvr_css;
    	else
    		changing_style.innerHTML = invr_css;
    	break;

    case 73: //press Ctrl + Alt + I to inspect
    	dynamic_add_elements = false;
    	changing_style.innerHTML = invr_css;
    	break;
    }
}

//Switches to a new video source and then shows the player
function showNewVideo(id){
	video_element.SetScource(id);
	showVideoPlayer();
}

//Toggle the media player
function showVideoPlayer(){
	var v_element_visibility = video_element.IsVisible();

    video_element.SetVisiblity(!v_element_visibility);
    a_element_container.setAttribute("visible", v_element_visibility);

    //Set position of the elements away from the clickable part of the world
    var position = a_element_container.getAttribute("position");
    if(v_element_visibility){
    	position = {x : position.x, y : position.y+1000, z : position.z};
    	cursor.setAttribute("raycaster","objects: .clickable; far: 90;");
    }else{
		position = {x : position.x, y : position.y-1000, z : position.z};
		cursor.setAttribute("raycaster","objects:; far: 90;");

    }

    //Set the position
    a_element_container.setAttribute("position", "");
    a_element_container.setAttribute("position", position);
}

//Function to start loading the a-scene
function load(){
    if(!init_started){
        init_started = true;
        init();
    }
}

document.addEventListener("page_fully_loaded", load); 
//document.dispatchEvent(page_fully_loaded_event);