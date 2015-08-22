
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
	TimerData.save(key, json_data)
end

get '/t/:key' do |key| 
	erb :index, :locals => {
		:js => {
			:key => key,
			:version => Time.now.to_f,
			:data => from_json(TimerData.load(key))
		}
	}
end

class TimerData
	@dir = 'data'

	def self.load(key)
		create_path!
		File.read(path(key))
	end

	def self.save(key, data)
		create_path!

		data = data.to_json
		File.write(path(key), data)
	end

	def self.path(key)
		File.join(@dir, "#{key}.txt")
	end

	def self.create_path!
		Dir.mkdir(@dir) unless Dir.exist? @dir
	end

end