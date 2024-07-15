require 'digest'
require 'pathname'

Jekyll::Hooks.register :site, :post_write do |site|
  puts "Starting asset versioning..."

  # Read all HTML and Markdown files once
  page_contents = {}
  Dir.glob(File.join(site.dest, '**', '*.{html,md}')).each do |page_path|
	page_contents[page_path] = File.read(page_path)
  end

  # Process each asset file
  Dir.glob(File.join(site.dest, '**', '*.{css,js,png,jpg,jpeg,gif,svg}')).each do |file_path|
	puts "Processing file: #{file_path}"
	content_hash = Digest::MD5.file(file_path).hexdigest

	# Normalize the file path to be relative to the root of the site
	normalized_file_path = "/#{Pathname.new(file_path).relative_path_from(Pathname.new(site.dest)).to_s}"
	versioned_path = "#{normalized_file_path}?v=#{content_hash}"

	puts "Generated versioned path: #{versioned_path}"

	# Update all page contents in memory
	page_contents.each do |page_path, content|
	  if content.include?(normalized_file_path)
		puts "Updating page: #{page_path}"
		puts "Original path: #{normalized_file_path}"
		puts "Versioned path: #{versioned_path}"
		page_contents[page_path] = content.gsub(normalized_file_path, versioned_path)
	  else
		puts "Path not found in page: #{page_path}"
		puts "Looking for: #{normalized_file_path}"
	  end
	end
  end

  # Write updated content back to the files
  page_contents.each do |page_path, content|
	File.write(page_path, content)
  end

  puts "Asset versioning completed."
end

