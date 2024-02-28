require('dotenv').config();
const Vehicle = require('../model/vehicles');


const HandleMessage = async (ws, data, id) => {
    var vals;
    try {
        const parsedMessage = JSON.parse(JSON.stringify(data));
        if (parsedMessage?.type == 'set' || parsedMessage?.type == 'get'){
            vals = await getValues(result);
            switch (parsedMessage?.type){
                case 'set': 
                    updateDB(vals, id);
                    break;
                case 'get':
                    retrieveDB(vals, id);
                    break;
            }
        }
    } catch (error) { 
        console.error(error);
        return; 
    }

    const getValues = async (doc) => {
        if (!doc?.type){
            return Error({'errMsg': 'Websocket missing type'});
        }
        if (doc.type === 'error'){
            return Error(doc.body?.errMsg || 'Websocket missing type');
        }
        const type = doc.type;
        if (!doc?.body?.[type]){
            return Error(doc.body?.errMsg || 'Websocket missing body/values');
        }
        return doc.body[type];
    };



    const updateDB = async (data, id) => {
        try {
            var vehicle;
            try {
                vehicle = await getVehicle(id);
            } catch (error){
                console.error(error);
                return Error(error); 
            }
            switch (data?.req){
                case 'parkMode':
                    if (vals?.parkMode != undefined){
                        Vehicle.updateOne(
                            { serialId: id },
                            {
                                $set: {
                                    parkMode: vals?.parkMode,
                                }
                            }
                        )
                    }
                    break;
                case 'lightMode':
                    if (vals?.lightMode != undefined){
                        Vehicle.updateOne(
                            { serialId: id },
                            {
                                $set: {
                                    lightMode: vals?.lightMode,
                                }
                            }
                        )
                    }
                    break;
                case 'autoMode': 
                if (vals?.autoMode != undefined){
                    Vehicle.updateOne(
                        { serialId: id },
                        {
                            $set: {
                                autoMode: vals?.autoMode,
                            }
                        }
                    )
                }
                break; 
            }
        } catch (error) {
            console.error('Websocket incoming messages failed:', error);
            return Error(error)
        }
    };



    const retrieveDB = async (data, id) => {
        var vehicle;
        try {
            vehicle = await getVehicle(id);
            const val = vehicle[data?.req];
            msg = JSON.stringify({
                action: "msg", 
                id: String(id),
                type: parsedMessage?.type,
                req: data?.req,
                value: val
            })
            
            console.log(msg);
            ws.send(msg);
        } catch (error) {
            console.error('Error sending message:', error);
            return Error(error); 
        }
    };


    const getVehicle = async (id) => {
        if (!id){
            return Error(`Vehicle ID ${id} not found`);
        }
        const vehicle = await Vehicle.findOne({ serialId: id }).exec();
        if (!vehicle){
            return Error(`Vehicle ID ${id} not found`);
        }
        return vehicle;
    };
};



module.exports = {
    HandleMessage
};