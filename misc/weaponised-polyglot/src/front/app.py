import os
import requests
import base64
import secrets
from flask import Flask, render_template, request, jsonify

app = Flask(__name__, static_folder='static', static_url_path='')

RUNNER_BACKEND_URL = os.getenv('RUNNER_BACKEND_URL', 'http://localhost:8080')

def verify_answer_in_output(output, nonce):
    decoded_output = base64.b64decode(output).decode('utf-8')
    return nonce in decoded_output

def all_outputs(outputs):
    list_outputs = []
    for output in outputs:
        decoded_output = base64.b64decode(output).decode('utf-8')
        list_outputs.append(decoded_output)
    joind_output = '<br><hr><br>'.join(list_outputs)
    return base64.b64encode(joind_output.encode('utf-8')).decode('utf-8')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/run', methods=['POST'])
def execute():
    try:
        data = request.get_json()
        
        languages = []
        match data.get('language', ''):
            case 'python':
                languages = ['python']
            case 'sql':
                languages = ['sql']
            case 'shell':
                data['language'] = 'bash'
                languages = ['bash']
            case 'ruby':
                languages = ['ruby']
            case 'perl':
                languages = ['perl']
            case 'lua':
                languages = ['lua']
            case 'php':
                languages = ['php']
            case 'all':
                languages = ['python', 'sql', 'bash', 'ruby', 'perl', 'lua', 'php']
            case _:
                raise Exception("Invalid language")
        
        encoded_code = base64.b64encode(data.get('code','').encode('utf-8')).decode('utf-8')

        runner_data = {
            'input':encoded_code,
            'runners':languages,
            'nonce':secrets.token_hex(32)
        }
        response = requests.post(RUNNER_BACKEND_URL.rstrip('/')+'/', json=runner_data)
        
        outputs = response.json().get('output')
        output = ""
        if data['language']=='all':
            if verify_answer_in_output(outputs['python'], runner_data['nonce']) and \
                verify_answer_in_output(outputs['sql'], runner_data['nonce']) and \
                verify_answer_in_output(outputs['bash'], runner_data['nonce']) and \
                verify_answer_in_output(outputs['ruby'], runner_data['nonce']) and \
                verify_answer_in_output(outputs['perl'], runner_data['nonce']) and \
                verify_answer_in_output(outputs['lua'], runner_data['nonce']) and \
                verify_answer_in_output(outputs['php'], runner_data['nonce']):
                return {'output':base64.b64encode(b"BZHCTF{G0D_bl3ss_7h3r3_w45_n0_3s0L4n9_1n_7he_m1x}").decode('utf-8')}, 200
            else:
                return {'output':all_outputs(outputs.values())}, 200
        else:
            output = outputs[data['language']]
        
        return {'output':output}, 200
    except Exception as e:
        return jsonify({'output': base64.b64encode(b"Well well well. That's a 'no'.<br>Looks like you are tinkering something you shouldn't.<br>If not you can complain to Shynif (Author).").decode('utf-8')}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
