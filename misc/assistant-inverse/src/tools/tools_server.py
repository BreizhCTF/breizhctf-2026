import json

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import re
import os
from openai import OpenAI

# Hmmm, you know I said to look in flag.txt right ? Here you go tho:
# BZHCTF{I_F#%$ING_L<3VE_A1_T00LING!!!}
# Let the poor LLM alone ;-;

app = Flask(__name__, static_folder='.')
CORS(app)

LLM_SERVER_URL = os.environ.get("LLM_SERVER_URL", "https://u6fyestry9ta3a-8000.proxy.runpod.net/")

import base64
import random

AVAILABLE_TOOLS = {
    "base64_encode": lambda text: {"encoded": base64.b64encode(text.encode()).decode()},
    "base64_decode": lambda text: {"decoded": base64.b64decode(text).decode()},
    "hex_encode": lambda text: {"encoded": text.encode().hex()},
    "hex_decode": lambda text: {"decoded": bytes.fromhex(text).decode()},
    "time": lambda location: {"message": "time to pwn", "location": location},
    "breton_music": lambda id: {"song": random.choice(BRETON_MUSIC_LIST)},
    "breton_recipes": lambda id: {"recipe": random.choice(BRETON_RECIPES_LIST)},
    "regional_weather": lambda location: {"temperature": 0, "weather": "rainy", "location": location},
    "flag": lambda location: {"flag": "BZHCTF{... hmmm, would be too simple would it?}"},
    "calculator": lambda expression: {"result": eval(expression)},
}

BRETON_MUSIC_LIST = [
    "La P'tite Fumée - Thunderbreizh",
    "Bro gozh ma zadoù",
    "Alan Stivell - Tri Martolod",
    "Tri Yann - La jument de Michao",
    "Tri Yann - Dans la lune au fond de l'eau"
]

BRETON_RECIPES_LIST = [
    "Crêpes bretonnes - Traditional thin and chewy dough",
    "Kouign-amann - Sugar on butter on sugar on butter",
    "Far breton - Breton flan dessert but better",
    "Cyber Schools - A regional specialty",
]

TOOL_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "base64_encode",
            "description": "Encode text to base64",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Text to encode"},
                },
                "required": ["text"],
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "base64_decode",
            "description": "Decode base64 text",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Base64 text to decode"},
                },
                "required": ["text"],
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "hex_encode",
            "description": "Encode text to hexadecimal",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Text to encode"},
                },
                "required": ["text"],
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "hex_decode",
            "description": "Decode hexadecimal to text",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Hex text to decode"},
                },
                "required": ["text"],
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "time",
            "description": "Get a cheerful time message",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "Location"},
                },
                "required": ["location"],
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "breton_music",
            "description": "Get a random Breton music recommendation",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "Song ID"},
                },
                "required": ["id"],
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "breton_recipes",
            "description": "Get a random Breton recipe",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "Recipe ID"},
                },
                "required": ["id"],
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "regional_weather",
            "description": "Gets the current weather for Brittany regions",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "Breton city name"},
                },
                "required": ["location"],
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "flag",
            "description": "Get the flag",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "Location"},
                },
                "required": ["location"],
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "Evaluate a mathematical expression",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {"type": "string", "description": "Mathematical expression to evaluate"},
                },
                "required": ["expression"],
            },
        }
    },
]

def extract_tool_calls(openai_response):
    if not openai_response.get('tool_calls',[]):
        return []
    return [{'name': call.function.name, 'arguments': json.loads(call.function.arguments), 'id': call.id} for call in openai_response['tool_calls']]

def call_llm_server(messages, tools=None):
    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=f"{LLM_SERVER_URL.rstrip('/')}/v1"
    )
    response = client.chat.completions.create(
        model="google/gemma-4-E4B-it",
        messages=messages,
        tools=tools,
        #extra_body={"chat_template_kwargs": {"enable_thinking": False}}
        extra_body={"chat_template_kwargs": {"tokenize": False, "add_generation_prompt":True}},
    )
    print(response.choices[0].message)
    tool_calls = response.choices[0].message.tool_calls
    if tool_calls:
        return {'tool_calls': tool_calls or "ERROR :("}
    else:
        return {'output': response.choices[0].message.content or "ERROR :("}

def execute_tool_calls(calls):
    results = []
    for call in calls:
        tool_name = call['name']
        tool_args = call['arguments']
        if tool_name not in AVAILABLE_TOOLS:
            results.append({"name": tool_name, "response": {"error": f"Tool '{tool_name}' not found"}})
            continue
        try:
            result = AVAILABLE_TOOLS[tool_name](**tool_args)
            results.append({"name": tool_name, "response": result})
        except Exception as e:
            results.append({"name": tool_name, "response": {"error": str(e)}})
    return results

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('messages')
    
    if not message:
        return jsonify({"error": "message required"}), 400
    
    messages = [{"role": "system", "content": "You are a helpful assistant for the Breizh CTF challengers. You are right now helping people located in Rennes, Bretagne, France."}]
    messages += message
    llm_response = call_llm_server(messages, tools=TOOL_SCHEMA)
    output = llm_response
    calls = extract_tool_calls(output)
    print(output)
    print(calls)

    if calls:
        results = execute_tool_calls(calls)
        print(results)
        messages.append({
            "role": "assistant",
            "tool_calls": [
                {
                    "id": call['id'],
                    "type": "function",
                    "function": {
                        "name": call['name'],
                        "arguments": json.dumps(call['arguments'])
                    }
                }
            for call in calls]
        })
        for result,call in zip(results,calls):
            messages.append({"role": "tool", "tool_call_id": call['id'], "name": call['name'], "content": json.dumps(result["response"])})
        print(messages)
        llm_response = call_llm_server(messages, tools=TOOL_SCHEMA)
        print(llm_response)
    
    output = llm_response['output']
    
    # Note pour le "replace": Skip le special token de fin. Si le format des "special token" leak c'est aussi un bon moyen d'exploit !
    return jsonify({"response": output.replace('<turn|>', ''), "tool_calls": calls}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
