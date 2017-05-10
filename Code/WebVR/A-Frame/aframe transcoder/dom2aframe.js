var pixels_in_one_unit,pixel_text_size;
//Standard z index
var z_index = -40;
//Width of the body
var body_width;

var update_all = true;

var a_elements = new Array();

var img_id = 0;

var animation_fps = 999;

var somethingdirty = false;

var vrcss;

var page_fully_loaded_event = new Event('page_fully_loaded');

var init_started = false;

//Container for all the transcoded elements
var a_element_container

//The element that will paly the video's
var video_element;

class Position{
    constructor(){
        this.top = 0;
        this.bottom = 0;
        this.left = 0;
        this.right = 0;
    }
}

class Element{
	constructor(domelement){
		this.domelement = domelement;
		this.aelement = null;

        //Listenes for direct css changes
		(new MutationObserver(this.updateDirt.bind(this))).observe(this.domelement, { attributes: true, childList: false, characterData: true, subtree: false });
		(new MutationObserver(UpdateAll.bind(this))).observe(this.domelement, { attributes: true, childList: false, characterData: true, subtree: false });

        //Listenes for css animations
        this.domelement.addEventListener("animationstart", this.startAnimation.bind(this));
        this.domelement.addEventListener("animationend", this.stopAnimation.bind(this));

        //Listenes for transition changes, only works on Microsoft Edge
        this.domelement.addEventListener("transitionstart", this.startAnimation.bind(this));
        this.domelement.addEventListener("transitionend", this.stopAnimation.bind(this));

        this.position = new Position();

        //Flag for when we need to redraw
        this.dirty = false;
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
        this.dirty = true;
        this.update();
        somethingdirty = true;
        UpdateAll.bind(this).call();
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
    updateDirt(){
        this.dirty = true;
        this.update();
        somethingdirty = true;
    }

    update(){
        //get new position and style
        var position = this.domelement.getBoundingClientRect();
        var element_style = window.getComputedStyle(this.domelement);

        //Check if something changed since last time, else we just stop the update
        if(this.comparePosition(position) && this.old_style === JSON.stringify(element_style) && !this.dirty)
            return;

        //Cash the last style and position
        this.updatePosition(position);
        this.old_style = JSON.stringify(element_style);

        this.elementSpecificUpdate(element_style);

        //Some standard CSS
        this.aelement.setAttribute("opacity", -1);
        if(element_style.getPropertyValue("visibility") === "hidden" || element_style.getPropertyValue("display") === "none"){
            this.aelement.setAttribute("opacity", 0);
        }
        else
            this.aelement.setAttribute("opacity", parseFloat(element_style.getPropertyValue("opacity")));

        this.dirty = false;
    }
}

function stripText(html){
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText;
}

class TextElement extends Element{
	constructor(domelement){
		super(domelement);

		this.aelement = document.createElement("a-text");
		this.update();
	}

	elementSpecificUpdate(element_style){
		//Calc the y possition
        var y = -((this.position.bottom - this.position.top) / 2 + this.position.top);
        this.aelement.setAttribute("position",{x: this.position.left/pixels_in_one_unit, y: y/pixels_in_one_unit, z: z_index});

        //Style attributes
        this.aelement.setAttribute("text","value: " + stripText(this.domelement.innerHTML) + ";");

        //First reset the color of the text to black and then to the color the text really has to be
        this.aelement.setAttribute('color', "rgb(0,0,0)");
		this.aelement.setAttribute('color', ""+element_style.getPropertyValue("color"));

		//Set width first to 0, else it will get set to 0 after the new width is set
        this.aelement.setAttribute("width",0);
        var scale = pixel_text_size * parseFloat(element_style.getPropertyValue("font-size"));
        this.aelement.setAttribute("width",scale * 20);

        //First reset the anchor to nothing and then back to left
		this.aelement.setAttribute("anchor","");
		this.aelement.setAttribute("anchor","left");
	}
}

class ContainerElement extends Element{
	constructor(domelement, depth){
		super(domelement);
		this.div_depth = depth;

		this.aelement = document.createElement("a-plane");
		this.update();
	}

	elementSpecificUpdate(element_style){
		var width = (this.position.right - this.position.left)/pixels_in_one_unit;
		var height = (this.position.bottom - this.position.top)/pixels_in_one_unit;

		if(element.tagName == "BODY")
			body_width = width;

		this.aelement.setAttribute("width", width);
		this.aelement.setAttribute("height", height);
		this.aelement.setAttribute('color', element_style.getPropertyValue("background-color"));

		var y = -this.position.top/pixels_in_one_unit - height/2;

		this.aelement.setAttribute('position', {x: this.position.left/pixels_in_one_unit + width/2, y: y, z: z_index + this.div_depth});
	}
}

class ImageElement extends Element{
	constructor(domelement, depth){
		super(domelement);
        this.div_depth = depth;

		//Image asset creation
		this.asset = this.domelement.cloneNode(true);
        var asset_id = "img-asset-" + img_id++;
        this.asset.setAttribute("id",asset_id);

		this.aelement = document.createElement("a-image");
		this.aelement.setAttribute("src","#"+asset_id);

		//Initiation update
		this.update();
	}

	getAsset(){
		return this.asset;
	}

	elementSpecificUpdate(element_style){
        var width = (this.position.right - this.position.left)/pixels_in_one_unit;
		var height = (this.position.bottom - this.position.top)/pixels_in_one_unit;

		this.aelement.setAttribute("width", width);
		this.aelement.setAttribute("height", height);

		this.aelement.setAttribute("text", "hallo");

		var y = -this.position.top/pixels_in_one_unit - height/2;

		this.aelement.setAttribute('position', {x: this.position.left/pixels_in_one_unit + width/2, y: y, z: z_index + this.div_depth});
	}
}

class ButtonElement extends Element{
	constructor(domelement){
		super(domelement);

		this.aelement = document.createElement("a-entity");

		//Make separate container and text element
		this.aplane = new ContainerElement(domelement, -0.1);
		this.atext = new TextElement(domelement);

		//Add container and text to this entity
		this.aelement.appendChild(this.aplane.getAElement());
		this.aelement.appendChild(this.atext.getAElement());

		//Make shure these are clickable by the raycaster
		this.aelement.classList.add('clickable');

		this.aelement.setAttribute("onclick", this.domelement.getAttribute("onclick"));
		this.aplane.getAElement().setAttribute("onclick", this.domelement.getAttribute("onclick"));
		this.atext.getAElement().setAttribute("onclick", this.domelement.getAttribute("onclick"));
		this.update();
	}

	clickElement(){
		this.domelement.click();
	}

	elementSpecificUpdate(element_style){
		this.aplane.update();
		this.atext.update();
	}
}

var grabbing = false;

//Check if the event is triggered because of a grab
function IsDragEvent(element){
	if(element.tagName == "BODY" && element.classList.contains("a-grabbing") && !grabbing){
		grabbing = true;
		return true;
	}else if(element.tagName == "BODY" && !element.classList.contains("a-grabbing") && grabbing){
		grabbing = false;
		return true;
	}
	return false;
}

function UpdateAll(mutations){
    if(update_all && somethingdirty){

        //Stop everything from updating when dragging
        if(IsDragEvent(this.getDomElement()))
            return;

    	for(var i = 0; i < a_elements.length; i++)
    		a_elements[i].update();

        somethingdirty = false;
	}
}

function init(){
    THREE.ImageUtils.crossOrigin = '';

	items = new Array(document.body);
	var doc_items = document.body.getElementsByTagName("*");

	for(var i = 0; i < doc_items.length; i++)
		items.push(doc_items[i]);


	var a_scene = document.createElement("a-scene");

    //Sky
    /*var a_sky = document.createElement("a-sky");
    a_sky.setAttribute("color", "#DDDDDD");
    a_scene.appendChild(a_sky);*/

    //Assets
    var a_assets = document.createElement("a-assets");
    a_assets.innerHTML = '<video id="iwb" autoplay loop="true" src="city-4096-mp4-30fps-x264-ffmpeg.mp4"></video>';
    a_scene.appendChild(a_assets);

    //Container for all the generated elements
    a_element_container = document.createElement("a-entity");
    a_element_container.setAttribute("id", "aElementContainer");
    a_scene.appendChild(a_element_container);

    var img_id = 0;
    var div_depth = -0.2;

    //Calc the ammount of pixels in 1 meter
	var standard_p = document.createElement("p");
	standard_p.setAttribute("style", "font-size:1em;")
    document.body.appendChild(standard_p);
    pixels_in_one_unit = parseFloat(window.getComputedStyle(standard_p).getPropertyValue("font-size"));
    pixel_text_size = 1/pixels_in_one_unit;
    document.body.removeChild(standard_p);

	for (i = 0; i < items.length; i++) {

		element = items[i];
        console.log(element);
		var new_a_element = null;

		if(element.tagName == "BODY" || element.tagName == "DIV" || element.tagName == "SECTION"){
			new_a_element = new ContainerElement(element,div_depth);

    		div_depth += 0.05;

			if(div_depth > 0.9)
				div_depth = 0.9;
		}

    	//Text based elements
	    if(element.tagName == "P" || element.tagName.startsWith("H") && parseFloat(element.tagName.split("H")[1])){
    		new_a_element = new TextElement(element);
	    }

        //Images
        if(element.tagName == "IMG"){
          new_a_element = new ImageElement(element, div_depth);
          a_assets.appendChild(new_a_element.getAsset());

          div_depth += 0.05;

            if(div_depth > 0.9)
                div_depth = 0.9;
        }

        if(element.tagName == "BUTTON" || element.tagName == "A"){
        	new_a_element = new ButtonElement(element);
        }


        //Push the element in the array of all elements
        if(new_a_element != null){
        	a_element_container.appendChild(new_a_element.getAElement());
        	a_elements.push(new_a_element);
        }

        /*if(!element.getAttribute("keepinvr"))
        	element.style.display="none";*/
	}

	//Camera
	camera_entity = document.createElement("a-entity");
	camera_entity.setAttribute("position", body_width/2 + " 0 0");
	camera = document.createElement("a-camera");
	camera.setAttribute("position", "0 0 0");
	//camera.setAttribute("far", "200");
	camera.setAttribute("stereocam","eye:left;");
	camera_entity.appendChild(camera);

	//Cursor
	cursor = document.createElement("a-cursor");
	//cursor.setAttribute("fuse",true);
	cursor.setAttribute("fuse-timeout",500);
	cursor.setAttribute("color","green");
	cursor.setAttribute("raycaster","objects: .clickable")
	camera.appendChild(cursor);

	//Cursor animations
	animation1 = document.createElement("a-animation");
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
	cursor.appendChild(animation2);

    //Inject css to get the VR button fixed
    vrcss = document.createElement('style');
    vrcss.innerHTML = ".a-enter-vr{position: fixed; bottom: 20;} .a-canvas{ display: none; }";
    document.body.appendChild(vrcss);

    a_scene.setAttribute("stats", true);
    a_scene.addEventListener("enter-vr",enterVr);
    a_scene.addEventListener("exit-vr",exitVr);
	a_scene.appendChild(camera_entity);

	video_element = new VideoElement(body_width/2 + " 0 0");
    a_scene.appendChild(video_element.GetElement(), camera_entity);

    document.body.appendChild(a_scene);
    video_element.init();
    video_element.SetScource("#iwb");
};

function enterVr(){
    vrcss.innerHTML = ".a-enter-vr{position: fixed; bottom: 20;} .a-canvas{ display: default; }";
}

function exitVr(){
    vrcss.innerHTML = ".a-enter-vr{position: fixed; bottom: 20;} .a-canvas{ display: none; }";
}

document.onkeydown = checkKey;

function checkKey(e) {

    e = e || window.event;

    //press E or A to go up and down. 
    //press P to show video
    //press T to change video representation method
    if (e.keyCode == '65') {
    	var pos = camera_entity.getAttribute("position");
        camera_entity.setAttribute("position", pos.x+ " "+ (pos.y + 2) +" "+ pos.z);
        video_element.SetPosition(pos);
    }
    else if (e.keyCode == '69') {
        var pos = camera_entity.getAttribute("position");
        camera_entity.setAttribute("position", pos.x+ " "+ (pos.y - 2) +" "+ pos.z);
        video_element.SetPosition(pos);
    } else if (e.keyCode == '84') {
        video_element.ToggleMode();
    } else if (e.keyCode == '80') {
    	var v_element_visibility = video_element.IsVisible();
        a_element_container.setAttribute("visible", v_element_visibility);
        video_element.SetVisiblity(!v_element_visibility);

        if(v_element_visibility)
        	cursor.setAttribute("raycaster","objects:")
        else
        	cursor.setAttribute("raycaster","objects: .clickable");
    }

}

function load(){
    if(!init_started){
        init_started = true;
        init();
    }
}

document.addEventListener("page_fully_loaded", load); 
document.dispatchEvent(page_fully_loaded_event);