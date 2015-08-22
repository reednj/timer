
require 'sinatra'
require 'sinatra/json'
#require "sinatra/content_for"
require "sinatra/reloader" if development?
require 'json'
require 'yaml'
require 'erubis'

require 'securerandom'

set :erb, :escape_html => true

helpers do
	def post_data
		request.body.rewind
		request.body.read
	end

	def from_json(data)
		JSON.parse(data, {:symbolize_names => true})
	end

	def halt_with_text(code, message = nil)
		halt code, {'Content-Type' => 'text/plain'}, message
	end
end

get '/' do
	key = SecureRandom.hex(4)
	TimerData.save(key, { :events => nil, :recent => nil })
	redirect to("/t/#{key}")
end

get '/t/:key.json' do |key| 
	TimerData.load(key)
end

post '/t/:key.json' do |key|
	json_data = from_json(post_data)
	version = TimerData.save(key, json_data)
	json :version => version
end

get '/t/:key' do |key| 
	halt_with_text 404, 'Not Found' unless TimerData.exist? key

	erb :index, :locals => {
		:js => {
			:key => key,
			:version => TimerData.version(key),
			:data => from_json(TimerData.load(key))
		}
	}
end

class TimerData
	@dir = 'data'

	def self.version(key)
		File.mtime(path key).to_i
	end

	def self.exist?(key)
		File.exist?(path key)
	end

	def self.load(key)
		create_path!
		File.read(path(key))
	end

	def self.save(key, data)
		create_path!

		data = data.to_json
		File.write(path(key), data)
		version(key)
	end

	def self.path(key)
		File.join(@dir, "#{key}.txt")
	end

	def self.create_path!
		Dir.mkdir(@dir) unless Dir.exist? @dir
	end

end