// EV3 ScratchX Plugin
// Copyright 2015 Ken Aspeslagh @massivevector
// Only tested on Mac. On Mac, ev3 brick must be named starting with "serial" if the plugin is to recognize it.
// Rename the brick before pairing it with the Mac or else the name gets cached and the serial port will have the old name
// My bricks are named serialBrick1 (etc)
// Turn off the iPod/iPhone/iPad checkbox on the EV3 Bluetooth settings after pairing or else it will not work at all

function timeStamp()
{
    return (new Date).toISOString().replace(/z|t/gi,' ').trim();
}

function console_log(str)
{
    console.log(timeStamp() + ": "  + str);
}

// scratchX is loading our javascript file again each time a saved SBX file is opened.
// JavaScript is weird and this causes our object to be reloaded and re-registered.
// Prevent this using global variable theEV3Device and EV3Connected that will only initialize to null the first time they are declared.
// This fixes a Windows bug where it would not reconnect.

var waitingCallbacks = waitingCallbacks || [[],[],[],[],[],[],[],[], [], []];
var waitingQueries = waitingQueries || [];
var global_sensor_result = global_sensor_result || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var thePendingQuery = thePendingQuery || null;


var warnedAboutBattery = warnedAboutBattery || false;
var deviceTimeout = deviceTimeout || 0;
var counter = counter || 0;
var poller = poller || null;
var pingTimeout = pingTimeout || null;

var waitingForPing = waitingForPing || false;

var DIRECT_COMMAND_PREFIX = "800000";
var DIRECT_COMMAND_REPLY_PREFIX = "000100";
var DIRECT_COMMAND_REPLY_SENSOR_PREFIX = "000400";
var DIRECT_COMMAND_REPLY_ALL_TYPES_PREFIX = "001000";

// direct command opcode/prefixes
var SET_MOTOR_SPEED = "A400";
var SET_MOTOR_STOP = "A300";
var SET_MOTOR_START = "A600";
var SET_MOTOR_STEP_SPEED = "AC00";
var NOOP = "0201";
var PLAYTONE = "9401";
var INPUT_DEVICE_READY_SI = "991D";
var INPUT_DEVICE_GET_TYPE_MODE = "9905";
var READ_SENSOR = "9A00";
var UIREAD  = "81"; // opUI_READ
var UIREAD_BATTERY = "12"; // GET_LBATT

var UIDRAW = "84";
var UIDRAW_FILLWINDOW = "13";
var UIDRAW_PICTURE = "07";
var UIDRAW_BMPFILE = "1C";
var UIDRAW_UPDATE = "00";
var UIWRITE_INIT_RUN = "19";
var BEGIN_DOWNLOAD = "0192";
var CONTINUE_DOWNLOAD = "8193"
var UIWRITE = "82";
var LED = "1B";

var SYSTEM_REPLY_ERROR = 5;

var mode0 = "00";
var TOUCH_SENSOR = "10";
var COLOR_SENSOR = "1D";
var ULTRASONIC_SENSOR = "1E";
var ULTRSONIC_CM = "00";
var ULTRSONIC_INCH = "01";
var ULTRSONIC_LISTEN = "02";
var ULTRSONIC_SI_CM = "03";
var ULTRSONIC_SI_INCH = "04";
var ULTRSONIC_DC_CM = "05";
var ULTRSONIC_DC_INCH = "06";

var READ_MOTOR_POSITION = "01";
var READ_MOTOR_SPEED = "02";

var GYRO_SENSOR = "20";
var GYRO_ANGLE = "00";
var GYRO_RATE = "01";
var GYRO_FAST = "02";
var GYRO_RATE_AND_ANGLE = "03";
var GYRO_CALIBRATION = "04";
var IR_SENSOR = "21";
var IR_PROX = "00";
var IR_SEEKER = "01";
var IR_REMOTE = "02"
var IR_REMOTE_ADVANCE = "03";
var IR_CALIBRATION = "05";
var REFLECTED_INTENSITY = "00";
var AMBIENT_INTENSITY = "01";
var COLOR_VALUE = "02";
var COLOR_RAW_RGB = "04";
var READ_FROM_MOTOR = "FOOBAR";

var DRIVE_QUERY = "DRIVE_QUERY";
var DRIVE_QUERY_DURATION = "DRIVE_QUERY_DURATION";
var TONE_QUERY = "TONE_QUERY";
var UIDRAW_QUERY = "UIDRAW_QUERY";
var SYSTEM_COMMAND = "SYSTEM_COMMAND";

var PRESSURE_SENSOR = "03"; //NXT-SND-DB
var PRESSURE_DB = "00"; 
var PRESSURE_DBA = "01";

var TEMP_SENSOR = "06"; //NXT-TEMP
var TEMP_FAHRENHEIT = "01"; 
var TEMP_CELCIUS = "00";

var frequencies = { "C4" : 262, "D4" : 294, "E4" : 330, "F4" : 349, "G4" : 392, "A4" : 440, "B4" : 494, "C5" : 523, "D5" : 587, "E5" : 659, "F5" : 698, "G5" : 784, "A5" : 880, "B5" : 988, "C6" : 1047, "D6" : 1175, "E6" : 1319, "F6" : 1397, "G6" : 1568, "A6" : 1760, "B6" : 1976, "C#4" : 277, "D#4" : 311, "F#4" : 370, "G#4" : 415, "A#4" : 466, "C#5" : 554, "D#5" : 622, "F#5" : 740, "G#5" : 831, "A#5" : 932, "C#6" : 1109, "D#6" : 1245, "F#6" : 1480, "G#6" : 1661, "A#6" : 1865 };

var colors = [ "none", "black", "blue", "green", "yellow", "red", "white"];

var IRbuttonNames = ['Top Left', 'Bottom Left', 'Top Right', 'Bottom Right', 'Top Bar'];
var IRbuttonCodes = [1,            2,              3,          4,              9];

var sensorPortsNames = [ "1", "2", "3", "4", "A", "B", "C", "D"];

var sensorNames = { "7E" : "None", "7F" : "Port Error", "FF" : "Unknown", "7D" : "Initializing", "07" : "Large Motor", "08" : "Medium Motor", "10" : "Button Sensor", "1D" : "Light Sensor", "1E" : "Ultrasonic Sensor", "20" : "Gyro Sensor", "21" : "Infrared Sensor", "01" : "Button Sensor (NXT)", "02" : "Light Sensor (NXT)", "03" : "Sound Sensor", "04" : "Light/Color Sensor (NXT)", "05" : "Ultrasonic Sensor (NXT)", "06" : "Temperature Sensor (NXT)" };

var port_Assignments = port_Assignments || [0, 0, 0, 0, 0, 0, 0, 0, 0];

var ledColors = {"off" : "00", "green" : "01", "red" : "02", "orange" : "03", "green flashing" : "04", "red flashing" : "05", "orange flashing" : "06", "green pulse" : "07", "red pulse" : "08", "orange pulse" : "09"}


function clearSensorStatuses()
{
    var numSensorBlocks = 9;
    for (x = 0; x < numSensorBlocks; x++)
    {
        waitingCallbacks[x] = [];
        global_sensor_result[x] = 0;
        port_Assignments[x] = 0;
    }
}

var lastCommandWeWereTrying = null;

function startupBatteryCheckCallback(result)
{
    console_log(timeStamp() + ": got battery level at connect: " + result);
    
    weConnected();
    
    playStartUpTones();
    
    if (result < 11 && !warnedAboutBattery)
    {
        batteryAlert();
        warnedAboutBattery = true;
    }
    
    clearScreen();

    uploadAndDrawCatFile();
    
    scanPorts();
    
    setupWatchdog();
    
    if (lastCommandWeWereTrying)
    {
        waitingQueries.push(lastCommandWeWereTrying);
        executeQueryQueue();
    }
}

function setupWatchdog()
{
    if (poller)
        clearInterval(poller);
    
    poller = setInterval(pingBatteryWatchdog, 10000);
}

function pingBatteryWatchdog()
{
    console_log("pingBatteryWatchdog");
    testTheConnection(pingBatteryCheckCallback);
    waitingForPing = true;
    pingTimeout = setTimeout(pingTimeOutCallback, 3000);
}

function pingTimeOutCallback()
{
    if (waitingForPing == true)
    {
        console_log("Ping timed out");
        if (poller)
            clearInterval(poller);
        
        disconnected();
    }
}

function pingBatteryCheckCallback(result)
{
    console_log("pinged battery level: " + result);
    if (pingTimeout)
        clearTimeout(pingTimeout);
    waitingForPing = false;
    
    if (result < 11 && !warnedAboutBattery)
    {
        batteryAlert();
        warnedAboutBattery = true;
    }
    
    //scanPorts();
}

function testTheConnection(theCallback)
{
    readThatBatteryLevel(theCallback);
}

function playStartUpTones()
{
    var tonedelay = 1000;
    setTimeout(function()
                      {
                      playFreqM2M(262, 100);
                      }, tonedelay);
    
    setTimeout(function()
                      {
                      playFreqM2M(392, 100);
                      }, tonedelay+150);
    
    setTimeout(function()
                      {
                      playFreqM2M(523, 100);
                      }, tonedelay+300);
}



//// conversion helper routines

// create hex string from bytes
function createHexString(arr)
{
    var result = "";
    for (i in arr)
    {
        var str = arr[i].toString(16);
        str = str.toUpperCase();
        str = str.length == 0 ? "00" :
        str.length == 1 ? "0" + str :
        str.length == 2 ? str :
        str.substring(str.length-2, str.length);
        result += str;
    }
    return result;
}

function stringToHexString(instring)
{
    var outString = "";
    instring.split('').map(function (c) { var hex = c.charCodeAt(0).toString(16); if (hex.length == 2) { outString += hex; } else { outString += '0' + hex;} });
    outString += "00";
    return outString;
}

function decimalToLittleEndianHex(d, padding)
{
    var hex = Number(d).toString(16);
    padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;
    
    while (hex.length < padding)
    {
        hex = "0" + hex;
    }
    
    var a = hex.match(/../g);             // split number in groups of two
    a.reverse();                        // reverse the groups
    hex = a.join("");                // join the groups back together
    
    return hex;
}

function getFloatResult(inputData)
{
    var a = new ArrayBuffer(4);
    var c = new Float32Array(a);
    var arr = new Uint8Array(a);
    arr[0] = inputData[5];
    arr[1] = inputData[6];
    arr[2] = inputData[7]
    arr[3] = inputData[8]
    return c[0];
}

function getIRButtonNameForCode(inButtonCode)
{
    for (var i = 0; i < IRbuttonCodes.length; i++)
    {
        if (inButtonCode == IRbuttonCodes[i])
        {
            return IRbuttonNames[i];
        }
    }
    return "";
}

function createMessage(str)
{
    return str; // yeah
}

// add counter and byte length encoding prefix. return Uint8Array of final message
function packMessageForSending(str)
{
    var length = ((str.length / 2) + 2);
    
    var a = new ArrayBuffer(4);
    var c = new Uint16Array(a);
    var arr = new Uint8Array(a);
    c[1] = counter;
    c[0] = length;
    counter++;
    var mess = new Uint8Array((str.length / 2) + 4);
    
    for (var i = 0; i < 4; i ++)
    {
        mess[i] = arr[i];
    }
    
    for (var i = 0; i < str.length; i += 2)
    {
        mess[(i / 2) + 4] = parseInt(str.substr(i, 2), 16);
    }
    
    return mess;
}

// motor port bit field from menu choice string
function getMotorBitsHexString(which)
{
    if (which == "A")
        return "01";
    else if (which == "B")
        return "02";
    else if (which == "C")
        return "04";
    else if (which == "D")
        return "08";
    else if (which == "B+C")
        return "06";
    else if (which == "A+D")
        return "09";
    else if (which == "all")
        return "0F";
    
    return "00";
}

// motor port bit field from menu choice string
function getSensorBitsHexStringFromIndex(which)
{
    if (which == 1)
        return "00";
    else if (which == 2)
        return "01";
    else if (which == 3)
        return "02";
    else if (which == 4)
        return "03";
    else if (which == 5)
        return "10";
    else if (which == 6)
        return "11";
    else if (which == 7)
        return "12";
    else if (which == 8)
        return "13";
    return "00";
}

function getMotorIndex(which)
{
    if (which == "A")
        return 4;
    else if (which == "B")
        return 5;
    else if (which == "C")
        return 6;
    else if (which == "D")
        return 7;
}

// create 8 bit hex couplet
function hexcouplet(num)
{
    var str = num.toString(16);
    str = str.toUpperCase();
    if (str.length == 1)
    {
        return "0" + str;
    }
    return str;
}

// int bytes using weird serialization method
function getPackedOutputHexString(num, lc)
{
    // nonsensical unsigned byte packing. see cOutputPackParam in c_output-c in EV3 firmware
    var a = new ArrayBuffer(4);
    var sarr = new Int32Array(a);
    var uarr = new Uint8Array(a);
    
    sarr[0] = num;
    
    if (lc == 0)
    {
        var bits = uarr[0];
        bits &= 0x0000003F;
        return hexcouplet(bits);
    }
    else if (lc == 1)
    {
        return "81" + hexcouplet(uarr[0]);
    }
    else if (lc == 2)
    {
        return "82" + hexcouplet(uarr[0]) + hexcouplet(uarr[1]);
    }
    else if (lc == 3)
    {
        return "83" + hexcouplet(uarr[0]) + hexcouplet(uarr[1]) + hexcouplet(uarr[2]) + hexcouplet(uarr[3]);
    }
    
    return "00";
}

//// command/query queue

function executeQueryQueueAgain(waitABit)
{
    setTimeout(
                      function()
                      {
                      executeQueryQueue();
                      } , waitABit);
}

function executeQueryQueue()
{
    if (waitingQueries.length == 0)
        return; // nothing to do
    
    if (!checkConnected())
        return;
    
    var query_info = waitingQueries[0]; // peek at first in line
    var thisCommand = null;
    
    if (query_info.length == 5) // a query with a response
    {
        var port = query_info[0];
        var type = query_info[1];
        var mode = query_info[2];
        var callback = query_info[3];
        var theCommand = query_info[4];
        
        if (thePendingQuery)
        {
            // we are waiting for a result
            if (thePendingQuery[0] == port)
            {
                // special case: we are actually already in the process of querying this same sensor (should we also compare the type and mode, or maybe just match the command string?)
                // so we don't want to bother calling it again
                waitingQueries.shift(); // remove it from the queue
                if (callback)
                    waitingCallbacks[port].push(callback);
                return;
            }
            // do nothing. we'll try again after the query finishes
            return;
        }
        waitingQueries.shift(); // remove it from the queue
        thePendingQuery = query_info;
        // actually go ahead and make the query
        var packedCommand = packMessageForSending(theCommand);
        sendCommand(packedCommand);
    }
    else if (query_info.length == 4) // a query with no response
    {
        if (thePendingQuery)    // bail if we're waiting for a response
            return;
        
        var type = query_info[0];
        var duration = query_info[1];
        var callback = query_info[2];
        var theCommand = query_info[3];
        
        var waitABit = 1;
        if (type == DRIVE_QUERY || type == DRIVE_QUERY_DURATION)
        {
            clearDriveTimer();
            if (type == DRIVE_QUERY_DURATION)
            {
                var parts =  theCommand.split("|");
                theCommand = parts[0];
                var stopMotors = parts[1];

                driveCallback = callback;   // save this callback in case timer is cancelled we can call it directly
                driveTimer = setTimeout(
                                               function()
                                               {
                                                   if (duration > 0) // allow zero duration to run motors asynchronously
                                                   {
                                                        motorsStop(stopMotors, 'coast'); // xxx
                                                   }
                                                   if (callback)
                                                        callback();
                                               } , duration*1000);
            }
        }
        else if (type == TONE_QUERY)
        {
            setTimeout(
                              function()
                              {
                              if (callback)
                              callback();
                              } , duration); // duration already in ms
        }
        else if (type == SYSTEM_COMMAND)
        {
            if (shouldChunkTranfers())
            {
                waitABit = 100;
            }
        }
        waitingQueries.shift(); // remove it from the queue
        
        // actually go ahead and make the query
        var packedCommand = packMessageForSending(theCommand);
        sendCommand(packedCommand);
        
        executeQueryQueueAgain(waitABit);   // maybe do the next one
    }
}

function addToQueryQueue(query_info)
{
    for (var i = 0; i < waitingQueries.length; i++)
    {
        var next_query = waitingQueries[i];
        if (next_query.length == 5) // a query with a response
        {
            var port = next_query[0];
            var type = next_query[1];
            var mode = next_query[2];
            var callback = next_query[3];
            var theCommand = next_query[4];
            var this_port = query_info[0];
            if (port == this_port)
            {
                var this_callback = query_info[3]
                if (this_callback)
                    waitingCallbacks[this_port].push(this_callback);
                console_log("coalescing query because there's already one in the queue.");
                return;
            }
        }
    }
    waitingQueries.push(query_info);
    executeQueryQueue();
}

function receive_handler(data)
{
    var inputData = new Uint8Array(data);
    console_log(">> received: " + createHexString(inputData));
    
    if (!(connectingOrConnected()))
    {
        console_log("Received Data but not connected or connecting");
        return;
    }
    
    if (!thePendingQuery)
    {
        console_log("Received Data and didn't expect it...");
        return;
    }
    
    var theResult = null;
    
    var port = thePendingQuery[0];
    var type = thePendingQuery[1];
    var mode = thePendingQuery[2];
    var callback = thePendingQuery[3];
    var theCommand = thePendingQuery[4];
    
    if (type == TOUCH_SENSOR)
    {
        var result = inputData[5];
        theResult = (result == 100);
    }
    else if (type == PRESSURE_SENSOR)
    {
       theResult = getFloatResult(inputData);
    }
    else if (type == TEMP_SENSOR)
    {
       theResult = getFloatResult(inputData);
    }
    else if (type == COLOR_SENSOR)
    {
        var num = Math.floor(getFloatResult(inputData));
        if (mode == AMBIENT_INTENSITY || mode == REFLECTED_INTENSITY)
        {
            theResult = num;
        }
        else if (mode == COLOR_VALUE)
        {
            if (num >= 0 && num < 7)
                theResult = colors[num];
            else
                theResult = "none";
        }
    }
    else if (type == IR_SENSOR)
    {
        if (mode == IR_PROX)
            theResult = getFloatResult(inputData);
        else if (mode == IR_REMOTE)
            theResult = getIRButtonNameForCode(getFloatResult(inputData));
    }
    else if (type == GYRO_SENSOR)
    {
        theResult = getFloatResult(inputData);
    }
    else if (type == READ_FROM_MOTOR)
    {
        if (mode == READ_MOTOR_POSITION)
            theResult = Math.round(getFloatResult(inputData) * 360); // round to nearest degree
        else
            theResult = getFloatResult(inputData);
    }
    else if (type == UIREAD)
    {
        if (mode == UIREAD_BATTERY)
        {
            theResult = inputData[5];
        }
    }

    else if (type == BEGIN_DOWNLOAD)
    {
        theResult = inputData[6];
        var handle = inputData[7];
        
        if (theResult == 0)
        {
            console_log("BEGIN_DOWNLOAD status: " + theResult + " handle: " + handle);
            
            var fileData = mode;
            
            continueDownload( decimalToLittleEndianHex(handle, 2), fileData);
        }
        else
        {
            console_log("BEGIN_DOWNLOAD non-success status: " + theResult + " handle: " + handle);
        }
    }
    else if (type == INPUT_DEVICE_GET_TYPE_MODE)
    {
        console_log("INPUT_DEVICE_GET_TYPE_MODE");
        
        for (x = 0; x <= 7; x++)
        {
            var val = inputData[5+(x*2)];
            console_log(sensorPortsNames[x] + ": " + sensorNames[hexcouplet(val)])
            
            port_Assignments = val;
        }
    }
    
    global_sensor_result[port] = theResult;
    
    // do the callback
    console_log("result: " + theResult);
    if (callback)
        callback(theResult);
    
    while(callback = waitingCallbacks[port].shift())
    {
        console_log("result (coalesced): " + theResult);
        callback(theResult);
    }
    
    // done with this query
    thePendingQuery = null;
    
    // go look for the next query
    executeQueryQueueAgain(1);
}

//// extension callbacks



function capSpeed(speed)
{
    if (speed > 100) { speed = 100; }
    if (speed < -100) { speed = -100; }
    return speed;
}



function motor(which, speed)
{
    speed = capSpeed(speed);
    var motorBitField = getMotorBitsHexString(which);
    
    var speedBits = getPackedOutputHexString(speed, 1);
    
    var motorsOnCommand = createMessage(DIRECT_COMMAND_PREFIX + SET_MOTOR_SPEED + motorBitField + speedBits + SET_MOTOR_START + motorBitField);
    
    return motorsOnCommand;
}

function motor2(which, speed)
{
    speed = capSpeed(speed);
    var p =  which.split("+");
    
    var motorBitField1 = getMotorBitsHexString(p[0]);
    var motorBitField2 = getMotorBitsHexString(p[1]);
    var motorBitField = getMotorBitsHexString(which);
    
    var speedBits1 = getPackedOutputHexString(speed, 1);
    var speedBits2 = getPackedOutputHexString(speed * -1, 1);
    
    var motorsOnCommand = createMessage(DIRECT_COMMAND_PREFIX
                                        + SET_MOTOR_SPEED + motorBitField1 + speedBits1
                                        + SET_MOTOR_SPEED + motorBitField2 + speedBits2
                                        
                                        + SET_MOTOR_START + motorBitField);
    
    return motorsOnCommand;
}



function playFreqM2M(freq, duration)
{
    console_log("playFreqM2M duration: " + duration + " freq: " + freq);
    var volume = 100;
    var volString = getPackedOutputHexString(volume, 1);
    var freqString = getPackedOutputHexString(freq, 2);
    var durString = getPackedOutputHexString(duration, 2);
    
    var toneCommand = createMessage(DIRECT_COMMAND_PREFIX + PLAYTONE + volString + freqString + durString);
    
    addToQueryQueue([TONE_QUERY, 0, null, toneCommand]);
}

function clearDriveTimer()
{
    if (driveTimer)
        clearInterval(driveTimer);
    driveTimer = 0;
    if (driveCallback)
        driveCallback();
    driveCallback = 0;
}


var driveTimer = 0;
driveCallback = 0;

function howStopCode(how)
{
    if (how == 'brake')
        return 1;
    else
        return 0;
}

function motorsStop(which, how)
{
    console_log(which + " motor(s) stopped");
    
    var motorBitField = getMotorBitsHexString(which);
    
    var howHex = getPackedOutputHexString(howStopCode(how), 1);
    
    var motorsOffCommand = createMessage(DIRECT_COMMAND_PREFIX + SET_MOTOR_STOP + motorBitField + howHex);
    
    addToQueryQueue([DRIVE_QUERY, 0, null, motorsOffCommand]);
}

/*
 function sendNOP()
 {
 var nopCommand = createMessage(DIRECT_COMMAND_PREFIX + NOOP);
 }
 */



function readTouchSensor(portInt, callback)
{
    readFromSensor(portInt, TOUCH_SENSOR, mode0, callback);
}

function readIRRemoteSensor(portInt, callback)
{
    readFromSensor2(portInt, IR_SENSOR, IR_REMOTE, callback);
}

function readFromColorSensor(portInt, modeCode, callback)
{
    readFromSensor2(portInt, COLOR_SENSOR, modeCode, callback);
}



function readThatBatteryLevel(callback)
{
    console_log("Going to read battery level");
    var portInt = 8; // bogus port number
    UIRead(portInt, UIREAD_BATTERY, callback);
}


function readFromSensor(port, type, mode, callback)
{
    var theCommand = createMessage(DIRECT_COMMAND_REPLY_PREFIX +
                                   READ_SENSOR +
                                   hexcouplet(port) +
                                   type +
                                   mode + "60");
    
    addToQueryQueue([port, type, mode, callback, theCommand]);
}

function readFromSensor2(port, type, mode, callback)
{
    var theCommand = createMessage(DIRECT_COMMAND_REPLY_SENSOR_PREFIX +
                                   INPUT_DEVICE_READY_SI + "00" + // layer
                                   hexcouplet(port) + "00" + // type
                                   mode +
                                   "0160"); // result stuff
    
    addToQueryQueue([port, type, mode, callback, theCommand]);
}


// this routine is awful similar to readFromSensor2...
function readFromAMotor(port, type, mode, callback)
{
    var theCommand = createMessage(DIRECT_COMMAND_REPLY_SENSOR_PREFIX +
                                   INPUT_DEVICE_READY_SI + "00" + // layer
                                   hexcouplet(port+12) + "00" + // type
                                   mode +
                                   "0160"); // result stuff
    
    addToQueryQueue([port, type, mode, callback, theCommand]);


   
}

function UIRead(port, subtype, callback)
{
    var theCommand = createMessage(DIRECT_COMMAND_REPLY_PREFIX +
                                   UIREAD + subtype +
                                   "60"); // result stuff
    
    addToQueryQueue([port, UIREAD, subtype, callback, theCommand]);
}

function setLED(pattern, callback)
{
    console_log("setting LED to: " + pattern);
    
    var theCommand = createMessage(DIRECT_COMMAND_PREFIX +
                                   UIWRITE + LED + ledColors[pattern]);
    
    addToQueryQueue([UIWRITE, 0, callback, theCommand]);
}


function clearScreen()
{
    var theCommand = createMessage(DIRECT_COMMAND_PREFIX +
                                   UIDRAW + UIDRAW_FILLWINDOW +
                                   "000000" + UIDRAW + UIDRAW_UPDATE);
    
    addToQueryQueue([UIDRAW_QUERY, 0, null, theCommand]);
}

// image file code

function uploadAndDrawCatFile()
{
    var fileName = "../prjs/tst/jc.rgf";
    var catRGFFile = "b0800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020202020404040404080808081000101010103000800f860f061f061f0c1e0c3e183e183c187c307c3000c01f861f863f863f0c3f0c7f0c7e187e18fe18fc3000c038c3388771867186730c630ce31cc618c619c63900c0f0c3f083e187e187e107c30fc30fc30f861f861f00c0e0c1e0c1e083c183c183830783078307060f060f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000c03f0000000000000000000000000000000000000000f0ff0000000000000000000000000000000000000000ffc003000000000000000000000000000000000000e03f000e000000000000000000000000000000000000f83f0070000000000000000000000000000000000000fe0f00c0010000000000000000000000000000000000ff0300000700000000000000000000000000000000c0ff0000000e00000000000000000000000000000000f03f0000001800000000000000000000000000000000f80f0000001000000000000060f0c70f1f0000000000fc070000003000000000000060f0e398310000000000fe0700000020000000000000603030c0600000000000ff1f00000040000000000000603030c0600000000080ff1f0000004000000000000060f037ce4000000000c0ff1f00000080000000000000603030de6000000000e0ffff03000000010000000000603030d86000000000f0ffff7f000000020000000000603060986100000000f8ffffff030000060000000000e0f7e39f3f00000000fcffffff3f0000040000000000e0f787071e00000000fcffffffff0100080000000000000000000000000000feff47ffff0700080000000000000000000000000000feff0300fe1f00180000000000000000000000000000feff010000ff00100000000000000000000000000000feff010000fc03300000000000000000000000000000feff050000f00f300000000000000000000800000000ffff030000c01f200000000000104200003e00600000ffff010000003f200000000000104700002300600000ffff1f0000007f20000000000030671e4127387c3c12ffff1f080000fe20000000000030653e632f7f7e7e1efdff3f0d0000f8210000000000302560222363636306fcffffd80000f0030000000000a02d7e362363637f02ccff7ffe0100c0070000000000e03c66362363633f02ecff7ffc1f00802f0000000000e038631c2363630302ecff7ff87f00001f0000000000c0187e1c23637e7e02e4ff3ffeff0000040000000000c0187e0c23625c3c02f47f3ffcff03003c00000000000000000c0000000000f0ff3ffec70f08390000000000000000040000000000f0ff1ffe8f07303b0000000000000000000000000000f0ff0fe4070670300000000000000000000000000000f2ff0ffc5f007031000000000000000000000000000032ff0ff8ff01703100000000000000000000000000001a1e0ff8ff03f81100000000000000000000000000003a800770ff07f80500000000000000000000000000007a8007e0d103f80c00000000000000000000000000007a8003c0030efc0f0000000000000000000000000000fac003000f00fc070000000000000000000000000000fbf000002800fe030000000000000000000000000000fbf800000000fe03000000000000000000000000008073bc00000000f60000000000000000000000000000807bff0000000077060000000000000000000000000080fbff03000080b30f0000000000000000000000000080dbff3f0000c0f3070000000000000000000000000080fbff7f0800e07b070000000000000000000000000000f9ffff1000f073060000000000000000000000000000fcffff1000f870030000000000000000000000000000fcff7f2000fc30010000000000000000000000000000fcff7f00007e30000000000000000000000000000000fc7f3c00000080000000000000000000000000000000fcffc100000081000000000000000000000000000000fcff8f03000040000000000000000000000000000000fcff3f07004000000000000000000000000000000000fcffff0e001000000000000000000000000000000000fa1fff1f0008000000000000000000000000000000c0ff1fe01f008c030000000000000000000000000000c0ff7f001c0004000000000000000000000000000000c0ffff03088007000000000000000000000000000000c0ffff0f00c003000000000000000000000000000000c0ff1f1e08e001000000000000000000000000000000c0ff0000c0f80100000000000000000000000000000080ff0000c8fd0000000000000000000000000000000080ff0100f87e0000000000000000000000000000000080ff0700703e0000000000000000000000000000000000ff7f00001f0000000000000000000000000000000000ffff01181f0000000000000000000000000000000000ffff03980f0000000000000000000000000000000000feff1ffe0f0000000000000000000000000000000000feff3fff070000000000000000000000000000000000feffffff070000000000000000000000000000000000fcffffff070000000000000000000000000000000000fcffff7f030000000000000000000000000000000000f8ffff7f030000000000000000000000000000000000f8ff9fbf010000000000000000000000000000000000f0ff9fbf030000000000000000000000000000000000f0ffbf93030000000000000000000000000000000000e0ff3f82030000000000000000000000000000000000e0ff3f86010000000000000000000000000000000000c0ffbfc1010000000000000000000000000000000000c0ffffc101000000000000000000000000000000000080ffffc300000000000000000000000000000000000080fddf630000000000000000000000000000000000001ef9df610000000000000000000000000000000000e00ff0ff330000000000000000000000000000000000fe07005f1e0000000000000000000000000000000000f001001e0c000000000000000000000000000000001e0000301a06000000000000000000000000000000001c0000f01f0300000000000000000000000000000000100000e01f0118000000000000000000000000000000000000008d0170000000000000000000000000000000000000008c00f0000000000000000000000000000000000000004000f8010000000000000000000000000000000000000000f0070000000000000000000000000000000000000000f00f0000000000000000000000000000000000000000201e00000000000000";

    uploadAndDrawRGFData(catRGFFile, fileName);
}

function drawFile(fileNameHex)
{
    console_log("UIDRAW_BMPFILE");
    var theCommand = createMessage(DIRECT_COMMAND_PREFIX +
                                   UIDRAW + UIDRAW_BMPFILE +
                                   "01" + // forground color
                                   getPackedOutputHexString(0,2) + getPackedOutputHexString(0,2) + // location
                                   "84" + fileNameHex + // LCS string encoding
                                   UIDRAW + UIDRAW_UPDATE);
    
    addToQueryQueue([UIDRAW_QUERY, 0, null, theCommand]);
}

function uploadAndDrawRGFData(fileDataHexString, name)
{
    var fileLength = fileDataHexString.length / 2;
    var lengthString = decimalToLittleEndianHex(fileLength, 8);
    
    var fileNameHex = stringToHexString(name);
    
    var theCommand = createMessage(
                                   BEGIN_DOWNLOAD + lengthString + fileNameHex //"6361742e726766000" // the filename...
                                   );
    
    addToQueryQueue([8, BEGIN_DOWNLOAD, fileNameHex + "|" + fileDataHexString, null, theCommand]);
}


function continueDownload(handle, fileData)
{
    console_log("CONTINUE_DOWNLOAD");
    var p =  fileData.split("|");
    
    var data = p[1];
    var nameHex = p[0];
    
    var chunkSize = (shouldChunkTranfers()) ? 256 : 65535;
    
    var totLen = data.length;
    var x;
    for (x = 0; x < totLen; x += chunkSize)
    {
        var thisdata = data.substring(x, x + chunkSize);
        
        var theCommand = createMessage(
                                       CONTINUE_DOWNLOAD + handle + thisdata
                                       );
        
        addToQueryQueue([SYSTEM_COMMAND, 0, null, theCommand]);
    }
    
    drawFile(nameHex);
}

function startMotors(which, speed)
{
    clearDriveTimer();
    
    console_log("motor " + which + " speed: " + speed);
    
    motorCommand = motor(which, speed);
    
    addToQueryQueue([DRIVE_QUERY, 0, null, motorCommand]);
}

function motorDegrees(which, speed, degrees, howStop)
{
    speed = capSpeed(speed);
    
    if (degrees < 0)
    {
        degrees *= -1;
        speed *= -1;
    }
    
    var motorBitField = getMotorBitsHexString(which);
    var speedBits = getPackedOutputHexString(speed, 1);
    var stepRampUpBits = getPackedOutputHexString(0, 3);
    var stepConstantBits = getPackedOutputHexString(degrees, 3);
    var stepRampDownBits = getPackedOutputHexString(0, 3);
    var howHex = getPackedOutputHexString(howStopCode(howStop), 1);
    
    var motorsCommand = createMessage(DIRECT_COMMAND_PREFIX + SET_MOTOR_STEP_SPEED + motorBitField + speedBits
                                      + stepRampUpBits + stepConstantBits + stepRampDownBits + howHex
                                      + SET_MOTOR_START + motorBitField);
    
    addToQueryQueue([DRIVE_QUERY, 0, null, motorsCommand]);
}


function playTone(tone, duration, callback)
{
    var freq = frequencies[tone];
    console_log("playTone " + tone + " duration: " + duration + " freq: " + freq);
    var volume = 100;
    var volString = getPackedOutputHexString(volume, 1);
    var freqString = getPackedOutputHexString(freq, 2);
    var durString = getPackedOutputHexString(duration, 2);
    
    var toneCommand = createMessage(DIRECT_COMMAND_PREFIX + PLAYTONE + volString + freqString + durString);
    
    addToQueryQueue([TONE_QUERY, duration, callback, toneCommand]);
}

function playFreq(freq, duration, callback)
{
    console_log("playFreq duration: " + duration + " freq: " + freq);
    var volume = 100;
    var volString = getPackedOutputHexString(volume, 1);
    var freqString = getPackedOutputHexString(freq, 2);
    var durString = getPackedOutputHexString(duration, 2);
    
    var toneCommand = createMessage(DIRECT_COMMAND_PREFIX + PLAYTONE + volString + freqString + durString);
    
    addToQueryQueue([TONE_QUERY, duration, callback, toneCommand]);
}

function motorsOff(which, how)
{
    clearDriveTimer();
    motorsStop(which, how);
}

function steeringControl(ports, what, duration, callback)
{
    clearDriveTimer();
    var defaultSpeed = 50;
    var motorCommand = null;
    if (what == 'forward')
    {
        motorCommand = motor(ports, defaultSpeed);
    }
    else if (what == 'reverse')
    {
        motorCommand = motor(ports, -1 * defaultSpeed);
    }
    else if (what == 'right')
    {
        motorCommand = motor2(ports, defaultSpeed);
    }
    else if (what == 'left')
    {
        motorCommand = motor2(ports, -1 * defaultSpeed);
    }
    
    addToQueryQueue([DRIVE_QUERY_DURATION, duration, callback, motorCommand + "|" + ports]); // special handle so we can stop the right motors
}

function whenButtonPressed(port)
{
    if (notConnected())
        return false;
    var portInt = parseInt(port) - 1;
    readTouchSensor(portInt, null);
    return global_sensor_result[portInt];
}

function whenRemoteButtonPressed(IRbutton, port)
{
    if (notConnected())
        return false;
    
    var portInt = parseInt(port) - 1;
    readIRRemoteSensor(portInt, null);
    
    return (global_sensor_result[portInt] == IRbutton);
}

function readTouchSensorPort(port, callback)
{
    var portInt = parseInt(port) - 1;
    readTouchSensor(portInt, callback);
}

function readColorSensorPort(port, mode, callback)
{
    var modeCode = AMBIENT_INTENSITY;
    if (mode == 'reflected') { modeCode = REFLECTED_INTENSITY; }
    if (mode == 'color') { modeCode = COLOR_VALUE; }
    if (mode == 'RGBcolor') { modeCode = COLOR_RAW_RGB; }
    
    var portInt = parseInt(port) - 1;
    readFromColorSensor(portInt, modeCode, callback);
}

//------------------------------------------------------

function readPressureSensorPort(port, mode, callback)
{   
    var portInt = parseInt(port) - 1;

    var _mode = mode || PRESSURE_DB; //does this sensor have a mode??
    
    readFromSensor2(portInt, PRESSURE_SENSOR, mode, callback);

}

function readTemperatureSensorPort(port, mode, callback)
{   
    var portInt = parseInt(port) - 1;

    var _mode = mode || TEMP_CELCIUS; //does this sensor have a mode??
    
    readFromSensor2(portInt, TEMP_SENSOR, mode, callback);

}

//-------------------------------------------------------

var lineCheckingInterval = 0;

function waitUntilDarkLinePort(port, callback)
{
    if (lineCheckingInterval)
        clearInterval(lineCheckingInterval);
    lineCheckingInterval = 0;
    var modeCode = REFLECTED_INTENSITY;
    var portInt = parseInt(port) - 1;
    global_sensor_result[portInt] = -1;
    
    lineCheckingInterval = setInterval(
                                              function()
                                              {
                                              readFromColorSensor(portInt, modeCode, null);
                                              if (global_sensor_result[portInt] < 25 && global_sensor_result[portInt] >= 0)    // darkness or just not reflection (air)
                                              {
                                              clearInterval(lineCheckingInterval);
                                              lineCheckingInterval = 0;
                                              callback();
                                              }
                                              }, 5);
}

function readGyroPort(mode, port, callback)
{
    var modeCode = GYRO_ANGLE;
    if (mode == 'rate') { modeCode = GYRO_RATE; }
    
    var portInt = parseInt(port) - 1;
    
    readFromSensor2(portInt, GYRO_SENSOR, modeCode, callback);
}

function readDistanceSensorPort(port, callback)
{
    var portInt = parseInt(port) - 1;
    
    readFromSensor2(portInt, IR_SENSOR, IR_PROX, callback);
}

function readRemoteButtonPort(port, callback)
{
    var portInt = parseInt(port) - 1;
    
    readIRRemoteSensor(portInt, callback);
}

function readFromMotor(mmode, which, callback)
{
    var portInt = getMotorIndex(which);
    var mode = READ_MOTOR_POSITION; // position
    if (mmode == 'speed')
        mode = READ_MOTOR_SPEED;
    
    readFromAMotor(portInt, READ_FROM_MOTOR, mode, callback);
}

function readBatteryLevel(callback)
{
    readThatBatteryLevel(callback);
}

function scanPorts()
{
    var mess = DIRECT_COMMAND_REPLY_ALL_TYPES_PREFIX;
    
    var globaloffset = 0;
    for (x = 1; x <= 8; x++)
    {
        var h = getSensorBitsHexStringFromIndex(x);
        mess += INPUT_DEVICE_GET_TYPE_MODE + "00" +  // layer
            h;
        mess += "e1";
        mess += hexcouplet(globaloffset++);
        mess += "e1";
        mess += hexcouplet(globaloffset++);
    }

    var theCommand = createMessage(mess);
    
    addToQueryQueue([9, INPUT_DEVICE_GET_TYPE_MODE, 0, null, theCommand]);
}

// delegate stuff

function shouldChunkTranfers()
{
    return false;
}

// ScratchX specific stuff

var DEBUG_NO_EV3 = false;
var theEV3Device = theEV3Device || null;
var EV3ScratchAlreadyLoaded = EV3ScratchAlreadyLoaded || false;
var EV3Connected = EV3Connected || false;
var potentialEV3Devices = potentialEV3Devices || [];
var waitingForInitialConnection = waitingForInitialConnection || false;
var potentialDevices = potentialDevices || []; // copy of the list
var connecting = connecting || false;
var connectionTimeout = connectionTimeout || null;

function batteryAlert()
{
    alert("Your battery is getting low.");
}

function connectingOrConnected()
{
    return (EV3Connected || connecting);
}

function weConnected()
{
    waitingForInitialConnection = false;
    
    EV3Connected = true;
    connecting = false;
}

function notConnected()
{
    return (!theEV3Device || !EV3Connected);
}

function disconnected()
{
    EV3Connected = false;
    
    //    alert("The connection to the brick was lost. Check your brick and refresh the page to reconnect. (Don't forget to save your project first!)");
    /* if (r == true) {
     reconnect();
     } else {
     // do nothing
     }
     */
}


function sendCommand(commandArray)
{
    if ((EV3Connected || connecting) && theEV3Device)
    {
        console_log("sending: " + createHexString(commandArray));
        
        theEV3Device.send(commandArray.buffer);
    }
    else
    {
        console_log("sendCommand called when not connected");
    }
}

function resetConnection()
{
    clearSensorStatuses();
    
    waitingQueries = [];
    
    // clear a query we might have been waiting for
    thePendingQuery = null;
    
    counter = 0;
}

function tryToConnect()
{
    console_log("tryToConnect()");
    
    lastCommandWeWereTrying = waitingQueries.pop();

    resetConnection();
    
    theEV3Device.open({ stopBits: 0, bitRate: 57600, ctsFlowControl: 0});
    console_log(': Attempting connection with ' + theEV3Device.id);
    theEV3Device.set_receive_handler(receive_handler);
    
    connecting = true;
    testTheConnection(startupBatteryCheckCallback);
    waitingForInitialConnection = true;
    connectionTimeout = setTimeout(connectionTimeOutCallback, 5000);
}

function connectionTimeOutCallback()
{
    if (waitingForInitialConnection == true)
    {
        console_log("Initial connection timed out");
        connecting = false;
        
        if (potentialDevices.length == 0)
        {
            console_log("Tried all devices with no luck.");
            
            //  alert("Failed to connect to a brick.\n\nMake sure your brick is:\n 1) powered on with Bluetooth On\n 2) named starting with serial (if on a Mac)\n 3) paired with this computer\n 4) the iPhone/iPad/iPod check box is NOT checked\n 5) Do not start a connection to or from the brick in any other way. Let the Scratch plug-in handle it!\n\nand then try reloading the webpage.");
            /*  if (r == true) {
             reconnect();
             } else {
             // do nothing
             }
             */
            theEV3Device = null;
            
            // xxx at this point, we might have an outstanding query with a callback we need to call...
        }
        else
        {
            tryNextDevice();
        }
    }
}

function tryNextDevice()
{
    potentialDevices.sort((function(a, b){return b.id.localeCompare(a.id)}));
    
    console_log("tryNextDevice: " + potentialDevices);
    var device = potentialDevices.shift();
    if (!device)
        return;
    
    theEV3Device = device;
    
    if (!DEBUG_NO_EV3)
    {
        tryToConnect();
    }
}

function tryAllDevices()
{
    console_log("tryAllDevices()");
    potentialDevices = potentialEV3Devices.slice(0);
    // start recursive loop
    tryNextDevice();
}

function checkConnected()
{
    if (!EV3Connected && !connecting)
    {
        console_log("executeQueryQueue called with no connection");
        if (theEV3Device && !connecting)
        {
            tryToConnect(); // try to connect
        }
        else if (!connecting)
        {
            tryAllDevices(); // try device list again
        }
        return false;
    }
    return true;
}
        
(
function(ext)
{
     ext.reconnectToDevice = function()
     {
        tryAllDevices();
     }
     
     ext._getStatus = function()
     {
         if (!EV3Connected)
            return { status:1, msg:'Disconnected' };
         else
            return { status:2, msg:'Connected' };
     };
     
     ext._deviceRemoved = function(dev)
     {
         console_log('Device removed');
         // Not currently implemented with serial devices
     };
     
     ext._deviceConnected = function(dev)
     {
         console_log('_deviceConnected: ' + dev.id);
         if (EV3Connected)
         {
            console_log("Already EV3Connected. Ignoring");
         }
         // brick's serial port must be named like tty.serialBrick7-SerialPort
         // this is how 10.10 is naming it automatically, the brick name being serialBrick7
         // the Scratch plugin is only letting us know about serial ports with names that
         // "begin with tty.usbmodem, tty.serial, or tty.usbserial" - according to khanning

         
         if ((dev.id.indexOf('/dev/tty.serial') === 0 && dev.id.indexOf('-SerialPort') != -1) || dev.id.indexOf('COM') === 0)
         // if (dev.id.indexOf('/dev/tty.serial-SerialPort') === 0)
         {
         
             if (potentialEV3Devices.filter(function(e) { return e.id == dev.id; }).length == 0)
             {
                potentialEV3Devices.push(dev);
             }
             
             if (!deviceTimeout)
                deviceTimeout = setTimeout(tryAllDevices, 1000);
         }
     };
     
     
     ext._shutdown = function()
     {
         console_log('SHUTDOWN: ' + ((theEV3Device) ? theEV3Device.id : "null"));
        /*
         if (theEV3Device)
         theEV3Device.close();
         if (poller)
         clearInterval(poller);
         EV3Connected = false;
         theEV3Device = null;
         */
     };
 
     ext._stop = function()
     {
         motorsOff("all", "coast");
     }
 
     ext.startMotors = function(which, speed)
     {
        startMotors(which, speed);
     }
     
     ext.motorDegrees = function(which, speed, degrees, howStop)
     {
        motorDegrees(which, speed, degrees, howStop);
     }
     
     ext.playTone = function(tone, duration, callback)
     {
        playTone(tone, duration, callback);
     }
     
     ext.playFreq = function(freq, duration, callback)
     {
        playFreq(freq, duration, callback);
     }
     
     ext.motorsOff = function(which, how)
     {
        motorsOff(which, how)
     }
 
     ext.steeringControl = function(ports, what, duration, callback)
     {
        steeringControl(ports, what, duration, callback)
     }
     
     ext.whenButtonPressed = function(port)
     {
        return whenButtonPressed(port);
     }
     
     ext.whenRemoteButtonPressed = function(IRbutton, port)
     {
        return whenRemoteButtonPressed(IRbutton, port);
     }
     
     ext.readTouchSensorPort = function(port, callback)
     {
        readTouchSensorPort(port, callback);
     }
     
     ext.readColorSensorPort = function(port, mode, callback)
     {
        readColorSensorPort(port, mode, callback);
     }
     ext.readPressureSensorPort = function(port, mode, callback)
     {
        readPressureSensorPort(port, mode, callback);
     }
     ext.readTemperatureSensorPort = function(port, mode, callback)
     {
        readTemperatureSensorPort(port, mode, callback);
     }
     ext.waitUntilDarkLinePort = function(port, callback)
     {
        waitUntilDarkLinePort(port, callback);
     }
     
     ext.readGyroPort = function(mode, port, callback)
     {
        readGyroPort(mode, port, callback);
     }
     
     ext.readDistanceSensorPort = function(port, callback)
     {
        readDistanceSensorPort(port, callback);
     }
     
     ext.readRemoteButtonPort = function(port, callback)
     {
        readRemoteButtonPort(port, callback);
     }
     
     ext.readFromMotor = function(mmode, which, callback)
     {
        readFromMotor(mmode, which, callback);
     }
     
     ext.readBatteryLevel = function(callback)
     {
        readBatteryLevel(callback);
     }
     ext.setLED = function(pattern, callback)
     {
        setLED(pattern, callback);
     }
     
     // Block and block menu descriptions
     var descriptor = {
     blocks: [
              ["w", "drive %m.dualMotors %m.turnStyle %n seconds",         "steeringControl",  "B+C", "forward", 3],
              [" ", "start motor %m.whichMotorPort speed %n",              "startMotors",      "B+C", 100],
              [" ", "rotate motor %m.whichMotorPort speed %n by %n degrees then %m.brakeCoast",              "motorDegrees",      "A", 100, 360, "brake"],
              [" ", "stop motors %m.whichMotorPort %m.brakeCoast",                       "motorsOff",     "all", "brake"],
              [" ", "set LED %m.patterns",                                 "setLED",                 "green"],
              ["h", "when button pressed on port %m.whichInputPort",       "whenButtonPressed","1"],
              ["h", "when IR remote %m.buttons pressed port %m.whichInputPort", "whenRemoteButtonPressed","Top Left", "1"],
              ["R", "button pressed %m.whichInputPort",                    "readTouchSensorPort",   "1"],
              ["w", "play note %m.note duration %n ms",                    "playTone",         "C5", 500],
              ["w", "play frequency %n duration %n ms",                    "playFreq",         "262", 500],
              ["R", "light sensor %m.whichInputPort %m.lightSensorMode",   "readColorSensorPort",   "1", "color"],
              ["R", "measure distance %m.whichInputPort",                  "readDistanceSensorPort",   "1"],
              ["R", "remote button %m.whichInputPort",                     "readRemoteButtonPort",   "1"],
              ["R", "motor %m.motorInputMode %m.whichMotorIndividual",     "readFromMotor",   "position", "A"],
              ['R', 'battery level',   'readBatteryLevel'],
              ['R', 'gyro  %m.gyroMode %m.whichInputPort',                 'readGyroPort',  'angle', '1'],
              ["R", "pressure sensor %m.whichInputPort",   "readPressureSensorPort",   "1"],
              ["R", "temperature sensor %m.tempMode %m.whichInputPort",   "readTemperatureSensorPort", 'celcius',   "1"],

                    ],
     "menus": {
     "whichMotorPort":   ["A", "B", "C", "D", "A+D", "B+C", "all"],
     "whichMotorIndividual":   ["A", "B", "C", "D"],
     "dualMotors":       ["A+D", "B+C"],
     "turnStyle":        ["forward", "reverse", "right", "left"],
     "brakeCoast":       ["brake", "coast"],
     "lightSensorMode":  ["reflected", "ambient", "color"],
     "motorInputMode": ["position", "speed"],
     "gyroMode": ["angle", "rate"],
     "tempMode": ["celcius", "fahrenheit"],
     "note":["C4","D4","E4","F4","G4","A4","B4","C5","D5","E5","F5","G5","A5","B5","C6","D6","E6","F6","G6","A6","B6","C#4","D#4","F#4","G#4","A#4","C#5","D#5","F#5","G#5","A#5","C#6","D#6","F#6","G#6","A#6"],
     "whichInputPort": ["1", "2", "3", "4"],
     "patterns": ["off", "green", "red", "orange", "green flashing", "red flashing", "orange flashing", "green pulse", "red pulse", "orange pulse"],
     "buttons": IRbuttonNames,
     },
     };
 
 //    ['w', 'wait until light sensor %m.whichInputPort detects black line',   'waitUntilDarkLinePort',   '1'],
 //    
 //  [' ', 'reconnect', 'reconnectToDevice'],
        /*
            
              Product ID:   0x0005
              Vendor ID:    0x0694  (Lego Group)


        */

     var serial_info = {type: 'serial', vendor: 0x0694, product: 0x0005}; // LEGO Mindstorms EV3
     ScratchExtensions.register('LEGO WAYFINDER', descriptor, ext, serial_info);
    
     console_log(' registered extension. theEV3Device:' + theEV3Device);
     
     console_log("EV3ScratchAlreadyLoaded: " + EV3ScratchAlreadyLoaded);
     EV3ScratchAlreadyLoaded = true;
})({});
