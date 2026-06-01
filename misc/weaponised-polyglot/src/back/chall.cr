require "http/server"
require "json"
require "base64"
require "file_utils"

# bait fake flag
def decode_flag
    enc = {{ "BZH{7h3r3_1s_5om37h1n9_sP3c14L_about_Qu1n35}" }}
end

def run_process_with_timeout(
  command : String,
  code : String,
  via_stdin : Bool,
  timeout : Time::Span = 2.seconds
) : {exit_status: Int32, output: String}
  output_mem = IO::Memory.new
  result_chan = Channel({Int32, String}).new
  
  input_io = via_stdin ? IO::Memory.new(code) : Process::Redirect::Close
  
  spawn do
    begin
      process = Process.new(
        command,
        input: input_io,
        output: output_mem,
        error: Process::Redirect::Close
      )
      exit_status = process.wait.exit_status
      output_str = output_mem.to_s
      result_chan.send({exit_status, output_str})
    rescue ex
      result_chan.send({1, ""})
    end
  end

  spawn do
    sleep timeout
    result_chan.close
  end

  begin
    status, output = result_chan.receive
    return {exit_status: status, output: output}
  rescue ex : Channel::ClosedError
    return {exit_status: 124, output: ""}  # timeout exit code
  end
end

def run_code(command : String, language : String, code : String, via_stdin : Bool) : {success: Bool, output: String}
  begin
    result = run_process_with_timeout(command, code, via_stdin, 2.seconds)
    
    if result[:exit_status] == 124
      return {success: false, output: "Timeout"}
    end
    
    return {success: true, output: result[:output]}
  rescue ex
    return {success: false, output: ex.message || "Unknown error"}
  end
end

def get_runner_command(runner : String) : String?
  case runner.downcase
  when "python"
    "/usr/bin/python3"
  when "sql"
    "/usr/bin/sqlite3"
  when "bash"
    "/bin/bash"
  when "ruby"
    "/usr/bin/ruby"
  when "perl"
    "/usr/bin/perl"
  when "lua"
    "/usr/bin/lua"
  when "php"
    "/usr/bin/php"
  else
    nil
  end
end

def process_request(body : String) : {status: Int32, body: String}
  begin
    json_data = JSON.parse(body)
    
    input_b64 = json_data["input"].as_s
    runners = json_data["runners"].as_a.map { |r| r.as_s }
    nonce = json_data["nonce"].as_s
    
    code = Base64.decode_string(input_b64)
    
    File.write("/tmp/flag.txt", nonce)
    
    outputs = {} of String => String
    
    runners.each do |runner_name|
      result = nil
      
      cmd = get_runner_command(runner_name)
      if cmd.nil?
        result = {success: false, output: "Unknown runner: #{runner_name}"}
      else
        result = run_code(cmd, runner_name, code, true)
      end
      
      encoded_output = Base64.strict_encode(result[:output])
      outputs[runner_name] = encoded_output
    end
    
    response = {
      "output" => outputs
    }
    
    # Clean up /tmp
    Dir.glob("/tmp/*").each do |path|
      FileUtils.rm_rf(path) if File.exists?(path)
    end
    
    return {status: 200, body: response.to_json}
  rescue ex
    error_response = {
      "error" => ex.message
    }
    return {status: 400, body: error_response.to_json}
  end
end

def main
  server = HTTP::Server.new do |context|
    case context.request.path
    when "/"
      context.response.content_type = "application/json"
      
      if context.request.method == "POST"
        body = context.request.body.not_nil!.gets_to_end
        result = process_request(body)
        context.response.status_code = result[:status]
        context.response.print(result[:body])
      else
        context.response.status_code = 405
        context.response.print({error: "Method not allowed"}.to_json)
      end
    else
      context.response.status_code = 404
      context.response.print({error: "Not found"}.to_json)
    end
  end

  address = server.bind_tcp "0.0.0.0", 8080
  puts "Server running at http://#{address}"
  server.listen
end

STDOUT.sync = true
main