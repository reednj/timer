
require 'sinatra'
require 'sinatra/json'
#require "sinatra/content_for"
require "sinatra/reloader" if development?
require 'json'
require 'yaml'
require 'erubis'

require 'securerandom'


get '/' do
	key = SecureRandom.hex(4)
	TimerData.save(key, { :events => nil, :recent => nil })
	redirect to("/t/#{key}")
end

get '/t/:key.json' do |key| 
	TimerData.load(key)
end

get '/t/:key' do |key| 
	erb :index, :locals => {
		:js => TimerData.load(key)
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