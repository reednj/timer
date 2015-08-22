
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
	key = request.cookies['timer_key']
	
	# we try to get the last used key from the cookie, but if we don't have it
	# then just generate a random one
	if key.nil?
		key = SecureRandom.hex(4) 
		TimerData.save(key, { :events => nil, :recent => nil })
	end

	redirect to("/t/#{key}")
end

get '/t/:key.json' do |key|
	halt_with_text 404, 'Not Found' unless TimerData.exist? key
	TimerData.load(key)
end

post '/t/:key.json' do |key|
	# if this file exists already, we need to make sure that the client is updating
	# from the same version, otherwise two clients could overwrite each others data
	# this way the save will fail if the versions are not the same
	if TimerData.exist? key
		updating_version = params[:v].to_i
		saved_version = TimerData.version key
		halt_with_text 500, 'version mismatch' if updating_version != saved_version
	end

	# now save the data and send the new verison number back to the client
	json_data = from_json(post_data)
	version = TimerData.save(key, json_data)
	json :version => version
end

get '/t/:key' do |key| 
	halt_with_text 404, 'Not Found' unless TimerData.exist? key

	# save the key to the cookie, so when the user comes back to the website we can
	# automatically redirect to this page, otherwise the data will be lost, unless the user
	# can remember the id
	response.set_cookie('timer_key', 
		:value => key,
		:path => '/',
		:expires => Time.now + (3600 * 24 * 365)
	)

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
		write(path(key), data)
		version(key)
	end

	def self.write(p, data)
		File.open(p, 'w:UTF-8') { |file|
			file.write(data)
		}
	end

	def self.path(key)
		File.join(@dir, "#{key}.txt")
	end

	def self.create_path!
		Dir.mkdir(@dir) unless File.exist?(@dir) && File.directory?(@dir)
	end

end