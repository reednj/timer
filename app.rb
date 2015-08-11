
require 'sinatra'
#require "sinatra/content_for"
require "sinatra/reloader" if development?
require 'json'
require 'yaml'
require 'erubis'

get '/' do
	erb :index
end

