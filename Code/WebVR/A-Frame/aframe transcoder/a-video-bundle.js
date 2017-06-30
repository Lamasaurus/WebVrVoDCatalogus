class VideoElement{
	constructor(position){

		this.video_element = document.createElement("a-entity");
		this.SetVisiblity(false);

		this.flatvid = document.createElement("a-video");
		this.flatvid.setAttribute("id","flatvid");
		this.flatvid.setAttribute("width","16");
		this.flatvid.setAttribute("height","9");
		this.flatvid.setAttribute("position","0 0 -6");
		this.video_element.appendChild(this.flatvid);

		this.sphericalvid = document.createElement("a-videosphere");
		this.sphericalvid.setAttribute("id","sphericalvid");
		this.sphericalvid.setAttribute("radius","80");
		this.sphericalvid.setAttribute("visible","false");
		this.sphericalvid.setAttribute("rotation","0 180 0");
		this.video_element.appendChild(this.sphericalvid);

		this.lefteye = document.createElement("a-entity");
		this.lefteye.setAttribute("id","lefteye");
		this.lefteye.setAttribute("geometry","primitive: sphere; radius: 80; segmentsWidth: 64; segmentsHeight: 64;");
		this.lefteye.setAttribute("material","shader: flat;");
		this.lefteye.setAttribute("scale","-1 1 1");
		this.lefteye.setAttribute("stereo","eye:left");
		this.lefteye.setAttribute("visible","false");
		this.video_element.appendChild(this.lefteye);

		this.righteye = document.createElement("a-entity");
		this.righteye.setAttribute("id","righteye");
		this.righteye.setAttribute("geometry","primitive: sphere; radius: 80; segmentsWidth: 64; segmentsHeight: 64;");
		this.righteye.setAttribute("material","shader: flat;");
		this.righteye.setAttribute("scale","-1 1 1");
		this.righteye.setAttribute("stereo","eye:left");
		this.righteye.setAttribute("visible","false");
		this.video_element.appendChild(this.righteye);

		this.vidcontrol = document.createElement("a-entity");
		this.vidcontrol.setAttribute("id","vidcontrol");
		this.vidcontrol.setAttribute("video-controls","src:");
		this.video_element.appendChild(this.vidcontrol);

		this.SetPosition(position);

		//0=flat 1=spheric 2=stereographic spheric
	    this.mode = 0;
	}

	GetElement(){
		return this.video_element;
	}

	ToggleMode(){
		this.mode = (this.mode + 1)%3;

        this.ShowVideo();
	}

	SetScource(source){
		this.flatvid.setAttribute("src",source);
	  	this.sphericalvid.setAttribute("src",source);
	    this.lefteye.setAttribute("material","shader:flat; src:"+source+";");
	    this.righteye.setAttribute("material","shader:flat; src:"+source+";");
	    this.vidcontrol.setAttribute("video-controls","src:"+source+"");
	}

	SetPosition(position){
		this.video_element.setAttribute("position", position);
	}

	ShowVideo(){
		if(this.mode == 0)
          flatvid.setAttribute("visible", true);
        else
          flatvid.setAttribute("visible", false);

        if(this.mode == 1)
          this.sphericalvid.setAttribute("visible", true);
        else
          this.sphericalvid.setAttribute("visible", false);

        if(this.mode == 2){
          this.lefteye.setAttribute("visible", true);
          this.righteye.setAttribute("visible", true);
        }else{
          this.lefteye.setAttribute("visible", false);
          this.righteye.setAttribute("visible", false);
        }
	}

	SetVisiblity(bool){
      	this.video_element.setAttribute("visible", bool);
	}

	IsVisible(){
		return this.video_element.getAttribute("visible");
	}
}