const token_cookie='comcast_access_token'
const loginErrMsg = 'Login failed. Please try again.'
const comcast_headers={'Content-Type': 'application/json', 'x-stringify-version': '2.0'}
const Bearer_prefix = "Bearer "
const login_url='https://api.stringify.com/v2/login'
const seeds_url='https://api.stringify.com/v2/seeds'
const parent_type='myHubRosetta'
const parent_val ='w1qUpEDz_1'
const attribSetAttr ='attribSet'
const heat_mode='heat'
const cold_mode='cool'
const allThermoContainer='#allThermo'
const noThermoContainer='#noThermo'
const thermoTemplate='#thermoTemplate'
const temperatureVal ='temperature'
const pwdEncodePostfix ='stringify'
const thermoId='.thermoId'
const thermoVal='.thermoVal'
const thermoSlider='.slider'
const seedIdKey='seedId'
const seedTempKey='seedTempKey'
var access_headers;

function login(id, pwd){
    $('#loginErrMsg').hide()
    var hash = CryptoJS.SHA256(pwd+id+pwdEncodePostfix); 
    let pwdEncode =hash.toString(CryptoJS.enc.Base64)
    let postData=JSON.stringify({ emailAddress: id, password: pwdEncode })
    $.ajax({
        method: "POST",
        url: login_url,
        headers: comcast_headers,
        processData:false,
        data: postData
    })
    .complete(function( resp ) {
        let msg = JSON.parse(resp.responseText)
        if (msg.access_token) {
            access_headers={...comcast_headers, Authorization: Bearer_prefix+msg.access_token}
            $('#thermoAccount').text(id).parent().show()
            getThermo(msg.access_token)
            hideLogin(id)
        }
        else
            showLoginErr()
    });
}

function showLoginErr(){
    $('#loginErrMsg').text(loginErrMsg).show()
}

function hideLogin(){
    $('#login').hide()
}

function getThermo(){
    $.ajax({
        method: "GET",
        url: seeds_url,
        headers: access_headers
    })
    .done(function( msg ) {
        if (msg.seeds) {
            let thermo = $(thermoTemplate)
            let noThermo = true
            let thermoContainer =$(allThermoContainer)

            msg.seeds.forEach(seed => {
                let attr={}
                if (seed[attribSetAttr])
                    attr=seed[attribSetAttr][0]
                if (seed[parent_type]==parent_val && (attr.mode==heat_mode || attr.mode==cold_mode)) {
                    showThermo(seed, thermo, thermoContainer)
                    noThermo = false
                }
            });
            showNoThermo(noThermo)
        }
        else
            showNoThermo(true)
    });
}

function showNoThermo(noThermo){
    if (noThermo){
        $(noThermoContainer).show()
        $(allThermoContainer).hide()
    }
    else {
        $(noThermoContainer).hide()
        $(allThermoContainer).show()
    }
}

function showThermo(seed, thermo, thermoContainer){
    let newThermo = thermo.clone()
    let temperature = Number(seed[attribSetAttr][0][temperatureVal])
    if (temperature != NaN) {
        newThermo.find(thermoId).text(seed.name)
        newThermo.find(thermoVal).text(temperature)
        newThermo.find(thermoSlider).slider()
            .slider('option', {'value': temperature, 'min': 60, 'max': 90})
            .slider({change: thermoChange, slide: thermoChanging})
        newThermo.data(seedIdKey, seed.seedId)
        newThermo.data(seedTempKey, temperature)
        newThermo.appendTo(thermoContainer).show()
    }
    else {
        newThermo.find().text('')
    }
}

function thermoChange(event, ui){
    let seed = $(ui.handle).parents(thermoTemplate)
    let seedId = seed.data(seedIdKey)
    seed.find(thermoVal).text(ui.value)

    $.ajax({
        method: "PUT",
        url: seeds_url+'/'+seedId+'/controls',
        headers: access_headers,
        processData:false,
        data: JSON.stringify({attribSet: [{"temperature": ui.value}]})
    })
    .complete(function( msg ) {
        let status=seed.find('.setStatus')
        if (msg.status==200) {
            status.text('set')
            setTimeout(()=>{status.text('')}, 1000)
        }
        else {
            let orgVal=seed.data(seedTempKey)
            seed.find(thermoVal).text(orgVal)
            seed.find(thermoSlider).slider({change: null})
                .slider('value',orgVal)
                .slider({change: thermoChange})
            status.text('failed')
            setTimeout(()=>{status.text('')}, 1000)

        }
    })
}

function thermoChanging(event, ui){
    let seed = $(ui.handle).parents(thermoTemplate)
    seed.find(thermoVal).text(ui.value)
}