//Is true if the user is grabbing the canvas
var grabbing = false;

//The id for elements
var element_id = 0;

//Class to represent a position
class Position{
    constructor(){
        this.vector = [0,0,0,1];

        this.width = 0;
        this.height = 0;
    }

    copyPosition(pos){
        this.vector[0] = Number(pos.left);
    	this.vector[1] = Number(pos.top);

        this.width = pos.width;
        this.height = pos.height;
    }
}

/*class TransformationMatrixManager{
	constructor(){
		this.reset();
	}

	reset(){
		this.matrix = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
	}

	translate(x,y,z){
		this.matrix = math.multiply([[1,0,0,x],[0,1,0,y],[0,0,1,z],[0,0,0,1]], this.matrix);
	}

	scale(x,y){
		this.matrix = math.multiply([[x,0,0,0],[0,y,0,0],[0,0,1,0],[0,0,0,1]], this.matrix);
	}

	rotate(x,y,z){
		//rotate x
		this.matrix = math.multiply([[1,0,0,0],
								[0,Math.cos(x),-Math.sin(x),0],
								[0,Math.sin(x),Math.cos(x),0],
								[0,0,0,1]], this.matrix);

		//rotate y
		this.matrix = math.multiply([[Math.cos(y),0,Math.sin(y),0],
								[0,1,0,0],
								[-Math.sin(y),1,Math.cos(y),0],
								[0,0,0,1]], this.matrix);

		//rotate z
		this.matrix = math.multiply([[Math.cos(x),-Math.sin(x),0,0],
								[Math.sin(x),Math.cos(3),0,0],
								[0,0,1,0],
								[0,0,0,1]], this.matrix);
	}
}*/

class TransformationManager{
	constructor(){
		this.position = [0,0,0];

		this.rotation = [0,0,0];

		this.scale = [1,1];
	}

	setPosition(x,y,z){
		this.position = [Number(x),Number(y),Number(z)];
	}

	setScale(x,y){
		this.scale = [Number(x),Number(y)];
	}

	setRotate(x,y,z){
		this.rotation = [Number(x),Number(y),Number(z)];
	}
}

//Basis of an element
class Element{
	constructor(domelement){
		this.domelement = domelement;
		
		//Make sure dom elements can tell theyr children to update
		this.domelement.setSubtreeDirty = () => { this.setSubtreeDirty(); };
		this.domelement.setSubtreeSeparate = () => { this.setSubtreeSeparate(); };
		this.aelement = null;

        //Listenes for direct css changes
		(new MutationObserver(this.checkIfDirty.bind(this))).observe(this.domelement, { attributes: true, childList: true, characterData: true, subtree: false, attributeOldValue : true });
		//(new MutationObserver(UpdateAll)).observe(this.domelement, { attributes: true, childList: false, characterData: true, subtree: false, attributeOldValue : true });

        //Listenes for css animations
        this.domelement.addEventListener("animationstart", this.startAnimation.bind(this));
        this.domelement.addEventListener("animationend", this.stopAnimation.bind(this));

        //Listenes for transition changes, only works on Microsoft Edge
        this.domelement.addEventListener("transitionstart", this.startAnimation.bind(this));
        this.domelement.addEventListener("transitionend", this.stopAnimation.bind(this));

        this.position = new Position();
        this.vr_position = [0,0,0];

        this.transformation = new TransformationManager();

        this.is_transparant = false;

        //Flag for when we need to redraw
        this.dirty = true;
	}

	//Sets the id of the element
	setId(){
		this.id = element_id++;
		this.aelement.setAttribute("id","ge_"+this.id);
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
			this.aelement.onclick = function(){ dom2aframe.showVideoPlayer(); if(this.domelement.onclick) this.domelement.onclick.call(this.domelement); }
			is_clickable = true;
		}

		//The play-video attribute shows the media player with a new video, that is specified by the attribute, when the element is clicked
		if(this.domelement.hasAttribute("play-video")){
			//Create video asset
			var video_id = asset_manager.GetAsset(this.domelement.getAttribute("play-video"), "video");
			this.aelement.onclick = function(){ dom2aframe.showNewVideo(video_id); if(this.domelement.onclick) this.domelement.onclick.call(this.domelement); }
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

			//Add lambda functions so we can use "this"
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
    	dom2aframe.somethingdirty = true;
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

	//Check if the event is triggered because of a grab
	SetDragEvent(element){
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

    //Checks if the element should be flagged as dirty and if its children also should be flagged
    checkIfDirty(mutation, is_animating){
    	if(this.SetDragEvent(this) || !mutation)
    		return;

    	for(var i = 0; i < mutation.length; i++){
	    	//Check if the element just stayed the same as before
	        if(mutation[i].oldValue === this.domelement.getAttribute(mutation[i].attributeName))
	        	continue;

	        /*log("Mutated element:")
	    	log(this);
	    	log("Mutation:")
	    	log(mutation[i]);*/

	    	//Check if the elements style and possibly the style of its children changed
	        if(mutation[i].type === "attributes" && (mutation[i].attributeName === "class" || mutation[i].attributeName === "style"))
	        	this.setSubtreeDirty();
	        else
	        	this.setDirty();

	        //this.update();
	    }
    }

    //Returns if an element is visible, el.offsetParent is null if a parent is invisible but the body always has a null value with this
	isNotHidden(el, style){
		return ((el.tagName === "BODY" || el.offsetParent !== null) && style.getPropertyValue("visibility") !== "hidden" && style.getPropertyValue("display") !== "none" && !this.is_transparant);
	}

	//Compares the position with its own position, returns true if they are the same
    comparePosition(position){
        return this.position.top == position.top && this.position.height == position.height && this.position.left == position.left && this.position.width == position.width && this.position.z == position.z;
    }

    //Set the subtree as separated
    setSubtreeSeparate(){
    	this.has_separated_parent = true;

    	var children = this.domelement.childNodes;
		for(var i = 0, len = children.length; i < len; i++)
			if(children[i].setSubtreeSeparate)
				children[i].setSubtreeSeparate();
    }

    //Get the value of the style, or 0 of it is null
    getStyleValue(name, computed_style){
    	return computed_style.getPropertyValue(name).trim();
    }

    getTransormation(computed_style){

    	this.updatePosition(this.getPosition());

		if(this.is_separate){
			var x = this.getStyleValue("--vr-x", computed_style);
			if(x == "null")
				x = this.position.vector[0];

			var y = this.getStyleValue("--vr-y", computed_style);
			if(y == "null")
				y = this.position.vector[1];

			var z = this.getStyleValue("--vr-z", computed_style);
			if(z == "null")
				z = this.position.vector[2];

			this.transformation.setPosition(x,y,z);

			//If there is a special vr scale deffined, use that
			var scale = computed_style.getPropertyValue("--vr-scale").trim();
			if(scale != "null"){
				scale = scale.split(" ");

				this.transformation.setScale(scale[0], scale[1]);
			}

			//If there is a special vr scale deffined, use that
			var rotation = computed_style.getPropertyValue("--vr-rotate").trim();
			if(rotation != "null"){
				rotation = rotation.split(" ");

				this.transformation.setRotate(rotation[0], rotation[1], rotation[2]);
			}
		}

		log("got matrix");
		log(this.transformation.position);
    }

    //Update to the new position
    updatePosition(position){
    	/*if(this.is_separate)
    		return;
    	else if(this.has_separated_parent){
    		if(this.position.left != position.left)
    			this.vr_position.left -= 
    	}*/

	    this.position = position;

	    if(this.is_separate)
	    	this.vr_position = this.transformation.position;
	    else
	    	this.vr_position = this.position.vector;
    }

	//Calc the position of the element when separate 
	getPosition(){
		/*if(this.has_separated_parent){//If the element has a parent that is separated, we have to position it correctly
			//Get the position or the parent on the html page and in vr space
			var parent_page_position = this.domelement.parentElement.getBoundingClientRect();
			var this.domelement.parentElement_vr_position = parent.vr_position;

			//Calculate position of the element
			this.vr_position.left = this.position.left - parent_page_position.left + parent_vr_position.left;
			this.vr_position.top = this.position.top - parent_page_position.top + parent_vr_position.top;

			this.vr_position.width = this.position.width;
			this.vr_position.height = this.position.height;

			this.vr_position.z = parent_vr_position.z;
		}else{*/
			var position = new Position();
			position.copyPosition(this.domelement.getBoundingClientRect());
			var parent_position = this.domelement.parentElement.getBoundingClientRect();
			position.vector[0] -= parent_position.left + parent_position.width/2;
			position.vector[1] -= parent_position.top + parent_position.height/2;

			return position;
		//}
	}

	checkIfSeparate(computed_style){
		return computed_style.getPropertyValue("--vr-x").trim() !== "null" || computed_style.getPropertyValue("--vr-y").trim() !== "null" || computed_style.getPropertyValue("--vr-z").trim() !== "null" || computed_style.getPropertyValue("--vr-rotate").trim() !== "null" || computed_style.getPropertyValue("--vr-scale").trim() !== "null";
	}

    //Generic update function
    update(){
        //Check if the element was flagged as dirty, this only happens when it's style may have changed
        if(this.isDirty()){
        	//Get the style of the elemtent, this is a heavy operation
	        var element_style = window.getComputedStyle(this.domelement);

	        //Check if is separated now
			this.is_separate = this.checkIfSeparate(element_style);

			if(this.is_separate && !this.has_separated_parent)
				this.setSubtreeSeparate();
			if(this.is_separate || this.has_separated_parent)
				this.getTransormation(element_style);

	        //Let the element update its own style
	        this.elementSpecificUpdate(element_style);

	        //Set the opacity of the element
	        var new_opacity = 0;
	        if(this.isNotHidden(this.domelement, element_style))
	            new_opacity = parseFloat(element_style.getPropertyValue("opacity"));
	    	this.aelement.setAttribute("opacity", "");
	    	this.aelement.setAttribute("opacity", new_opacity);

	    	this.aelement.setAttribute("scale", {x:this.transformation.scale[0], y:this.transformation.scale[1], z:1});
	    	this.aelement.setAttribute("rotation", {x:this.transformation.rotation[0], y:this.transformation.rotation[1], z:this.transformation.rotation[2]});

	        this.dirty = false;
	    }

        //Cash the new position
        this.updatePosition(this.getPosition());
        //Let the element update its own position
    	this.elementUpdatePosition();
    }
}

class TextElement extends Element{
	constructor(domelement, dontAddFunc){
		super(domelement);

		this.aelement = document.createElement("a-text");

		this.setId();

		if(!dontAddFunc)
			this.addFunctionality();
	}

	elementUpdatePosition(){
		//Calc the x and y possition
        var x = this.vr_position[0]/pixels_per_meter;
        var y = -(this.position.height / 2 + this.vr_position[1])/pixels_per_meter;

        this.aelement.setAttribute("position",{x: x, y: y, z: layer_difference + this.vr_position[2]});
	}

	//Strips all tags from a string
	stripText(html){
	    var tmp = document.createElement("DIV");
	    tmp.innerHTML = html;
	    return tmp.textContent || tmp.innerText;
	}

	elementSpecificUpdate(element_style){
        //Get the text value of the element
        this.aelement.setAttribute("text","value: " + this.stripText(this.domelement.innerHTML) + ";");

        if(dom2aframe.transparent != element_style.getPropertyValue("color")){
			this.aelement.setAttribute('color', "");
	        this.aelement.setAttribute('color', element_style.getPropertyValue("color"));

	        this.aelement.setAttribute("side","");
	        this.aelement.setAttribute("side","double");
	        this.is_transparant = false;
	    }else{ //If the element is transparent we just don't show it
	    	this.is_transparant = true;
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

		this.setId();

		if(!dontAddFunc)
			this.addFunctionality();
	}

	elementUpdatePosition(){
		this.width = this.position.width/pixels_per_meter;
		this.height = this.position.height/pixels_per_meter;

		//Calculate y and x position
		var y = -this.vr_position[1]/pixels_per_meter - this.height/2;
		var x = this.vr_position[0]/pixels_per_meter + this.width/2;

		this.aelement.setAttribute('position', {x: x, y: y, z: layer_difference + this.vr_position[2]});

		this.aelement.setAttribute("width", this.width);
		this.aelement.setAttribute("height", this.height);
	}

	//Check if string s is a url
	isUrl(s) {
	   var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
	   return regexp.test(s);
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
	
		if(dom2aframe.transparent != background_color || background_image){ //Check if the element is not transparent or has a background image
			if(this.isUrl(background_image)){//Check if the path to the background image is a legitimate url
				this.aelement.setAttribute('material','');
				//Set the source to the right asset id and alphaTest on 0.5, this makes that if a PNG uses alpha, that alpha is respected and not just white
				this.aelement.setAttribute('material','alphaTest: 0.5; src: #' + asset_manager.GetAsset(background_image, "img"));
			} else //If the background just is a color
				this.aelement.setAttribute('color', background_color);

			//Set double sided so we can look at the element from behind
			this.aelement.setAttribute("side","");
			this.aelement.setAttribute("side","double");

			this.is_transparant = false;
		}else{ //If the element is transparent we just don't show it
			this.is_transparant = true;
		}
	}
}

//Image elements represent img dom elements
class ImageElement extends Element{
	constructor(domelement){
		super(domelement);

		this.aelement = document.createElement("a-image");
		//Set the source of the element, this is the id  of the image element in the a-asset tag
		this.aelement.setAttribute("src","#"+asset_manager.GetAsset(this.domelement.getAttribute("src"),"img"));
		//Set alphaTest on 0.5, this makes that if a PNG uses alpha, that alpha is respected and not just white
		this.aelement.setAttribute("material","alphaTest: 0.5");

		this.setId();
		this.addFunctionality();
	}

	elementUpdatePosition(){
		//Calc with and height of the element
		var width = this.position.width/pixels_per_meter;
		var height = this.position.height/pixels_per_meter;

		this.aelement.setAttribute("width", width);
		this.aelement.setAttribute("height", height);

		//Calculate the x position
		var x = this.vr_position[0]/pixels_per_meter;
		//Calculate the y position
		var y = -this.vr_position[1]/pixels_per_meter - height/2;

		this.aelement.setAttribute('position', {x: x, y: y, z: layer_difference + this.vr_position[2]});
	}

	elementSpecificUpdate(element_style){
		this.aelement.setAttribute("src","#"+asset_manager.GetAsset(this.domelement.getAttribute("src"),"img"));
	}
}

//Text with background represents every element that contains pure text
class TextWithBackgroundElement extends Element{
	constructor(domelement){
		super(domelement);

		this.aelement = document.createElement("a-entity");
		this.aelement.setAttribute("side","double");

		//Make separate container and text element
		this.aplane = new ContainerElement(domelement);
		this.atext = new TextElement(domelement, true);

		//Add container and text to this entity
		this.aelement.appendChild(this.aplane.getAElement());
		this.aelement.appendChild(this.atext.getAElement());

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