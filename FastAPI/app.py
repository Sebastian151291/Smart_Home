from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pywizlight import wizlight, PilotBuilder
import webcolors
import logging
from tuya_connector import TuyaOpenAPI
import requests
import asyncio

#Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS setup
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tuya IoT Platform credentials
TUYA_ACCESS_ID = 'rfwcufuvtktkkxnwsedr'
TUYA_ACCESS_KEY = '49f3a6e6e59741d3b11cf66bcb30fdbe'
TUYA_API_URL = 'https://openapi.tuyaeu.com'

# Tuya device ID for the  sensor
TUYA_DEVICE_ID = 'bf0f2d0ab010dae793h3tw'

# Initialize Tuya OpenAPI
openapi = TuyaOpenAPI(TUYA_API_URL, TUYA_ACCESS_ID, TUYA_ACCESS_KEY)
openapi.connect()

# Light bulb IP addresses
light_bulbs = {
    "bec_sufragerie": ["192.168.0.174", "192.168.0.175", "192.168.215.197"],
    "bec_dormitor": ["192.168.0.190", "192.168.0.191", "192.168.215.93"]
}

#Romanian color names to English
romanian_to_english_colors = {
    "rosu": "red",
    "verde": "green",
    "albastru": "blue",
    "galben": "yellow",
    "cyan": "cyan",
    "magenta": "magenta",
    "alb": "white",
    "negru": "black"
}

brightness_levels = [25, 50, 75, 100]  
current_brightness = {bulb: 0 for bulb in light_bulbs} 

async def try_light_operation(ips, operation):
    for ip in ips:
        light = wizlight(ip)
        try:
            await operation(light)
            return {"success": True}
        except Exception as e:
            logger.error(f"Error operating on light with IP {ip}: {e}")
    return {"success": False, "error": "All IPs failed"}

@app.get("/sensor/status")
async def get_sensor_status():
    try:
        response = openapi.get(f'/v1.0/iot-03/devices/{TUYA_DEVICE_ID}/status')
        logger.info(f"Full Response: {response}")

        if response.get("success"):
            result = response.get("result", [])
            status_dict = {dp['code']: dp['value'] for dp in result}
            logger.info(f"Status Dictionary: {status_dict}")

            door_state = status_dict.get('doorcontact_state', 'unknown')
            battery_level = status_dict.get('battery_percentage', 'unknown')

            logger.info(f"Raw doorcontact_state value: {door_state}")

            if door_state is True:
                door_state_description = "open"
            elif door_state is False:
                door_state_description = "closed"
            else:
                door_state_description = "unknown"

            logger.info(f"Door State: {door_state_description}, Battery Level: {battery_level}")
            return {"success": True, "door_state": door_state_description, "battery_level": battery_level}
        else:
            error_msg = response.get("msg", "Failed to fetch sensor status")
            logger.error(f"Error fetching sensor status: {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)

    except requests.exceptions.RequestException as e:
        logger.error(f"Network error when getting sensor status: {e}")
        raise HTTPException(status_code=500, detail="Network error when fetching sensor status")
    except Exception as e:
        logger.error(f"Error getting sensor status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/lights/{bulb}/{state}")
async def toggle_light(bulb: str, state: str):
    ips = light_bulbs.get(bulb)
    if not ips:
        raise HTTPException(status_code=404, detail="Light bulb not found")
    async def operation(light):
        if state == "on":
            await light.turn_on(PilotBuilder())
        elif state == "off":
            await light.turn_off()
        else:
            raise HTTPException(status_code=400, detail="Invalid state. Use 'on' or 'off'.")
    result = await try_light_operation(ips, operation)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@app.post("/lights/{bulb}/color/{color_name}")
async def change_light_color(bulb: str, color_name: str):
    ips = light_bulbs.get(bulb)
    if not ips:
        raise HTTPException(status_code=404, detail="Light bulb not found")
    try:
        english_color_name = romanian_to_english_colors.get(color_name.lower(), color_name)
        rgb_color = webcolors.name_to_rgb(english_color_name)
    except webcolors.WebColorsException:
        raise HTTPException(status_code=404, detail="Color not supported")
    
    async def operation(light):
        await light.turn_on(PilotBuilder(rgb=rgb_color))
    
    result = await try_light_operation(ips, operation)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return {"success": True, "color": color_name}

@app.get("/lights/{bulb}/brightness/{action}")
async def adjust_brightness(bulb: str, action: str):
    ips = light_bulbs.get(bulb)
    if not ips:
        raise HTTPException(status_code=404, detail="Light bulb not found")
    global current_brightness
    if action == "increase":
        current_brightness[bulb] = (current_brightness[bulb] + 1) % len(brightness_levels)
    elif action == "decrease":
        current_brightness[bulb] = (current_brightness[bulb] - 1 + len(brightness_levels)) % len(brightness_levels)
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'increase' or 'decrease'.")
    
    async def operation(light):
        await light.turn_on(PilotBuilder(brightness=brightness_levels[current_brightness[bulb]]))
    
    result = await try_light_operation(ips, operation)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return {"success": True, "brightness": brightness_levels[current_brightness[bulb]]}

@app.get("/tuya/test")
async def test_tuya_api():
    try:
        response = openapi.get('/v2.0/cloud/thing')
        logger.info(f"Response: {response}")

        if response.get("success"):
            return response
        else:
            raise HTTPException(status_code=500, detail=response.get("msg", "Failed to fetch data from Tuya API"))

    except Exception as e:
        logger.error(f"Error with test call: {e}")
        raise HTTPException(status_code=500, detail=str(e))