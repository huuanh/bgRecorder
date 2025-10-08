#!/usr/bin/env node

// Script để áp dụng translations cho tất cả components
// Chạy: node apply-translations.js

const fs = require('fs');
const path = require('path');

// Mapping các text cần thay thế
const TEXT_REPLACEMENTS = {
  // Common
  "'Error'": "t('error', 'Error')",
  "'Success'": "t('success', 'Success')",
  "'Cancel'": "t('cancel', 'Cancel')",
  "'OK'": "t('ok', 'OK')",
  "'Apply'": "t('apply', 'Apply')",
  "'Loading...'": "t('loading', 'Loading...')",
  "'Try Again'": "t('try_again', 'Try Again')",
  
  // Recording
  "'Record'": "t('record', 'Record')",
  "'Stop Recording'": "t('stop_recording', 'Stop Recording')",
  "'Start Recording'": "t('start_recording', 'Start Recording')",
  "'Recording Failed'": "t('recording_failed', 'Recording Failed')",
  "'Unable to start recording. Please try again.'": "t('unable_to_start_recording', 'Unable to start recording. Please try again.')",
  "'Permission Required'": "t('permission_required', 'Permission Required')",
  "'Permissions'": "t('permissions', 'Permissions')",
  "'Cannot Change Settings'": "t('cannot_change_settings', 'Cannot Change Settings')",
  "'Stop recording first to change settings.'": "t('stop_recording_first', 'Stop recording first to change settings.')",
  "'Initialization Error'": "t('initialization_error', 'Initialization Error')",
  "'App is still starting up. Please wait a moment and try again.'": "t('app_starting_up', 'App is still starting up. Please wait a moment and try again.')",
  "'Permission Error'": "t('permission_error', 'Permission Error')",
  "'Please grant Camera and Microphone permissions to record video with audio.'": "t('grant_permissions', 'Please grant Camera and Microphone permissions to record video with audio.')",
  
  // Gallery
  "'Videos'": "t('videos', 'Videos')",
  "'Audios'": "t('audios', 'Audios')",
  "'No videos yet'": "t('no_videos_yet', 'No videos yet')",
  "'No audio files yet'": "t('no_audio_files_yet', 'No audio files yet')",
  "'Time'": "t('time', 'Time')",
  "'Ratio'": "t('ratio', 'Ratio')",
  "'Size'": "t('size', 'Size')",
  "'Duration'": "t('duration', 'Duration')",
  "'Loading videos...'": "t('loading_videos', 'Loading videos...')",
  "'No videos found'": "t('no_videos_found', 'No videos found')",
  "'Video deleted successfully'": "t('video_deleted_successfully', 'Video deleted successfully')",
  "'Audio deleted successfully'": "t('audio_deleted_successfully', 'Audio deleted successfully')",
  "'Failed to delete video'": "t('failed_to_delete_video', 'Failed to delete video')",
  "'Failed to delete audio'": "t('failed_to_delete_audio', 'Failed to delete audio')",
  "'Video file not found'": "t('video_file_not_found', 'Video file not found')",
  "'Audio file not found'": "t('audio_file_not_found', 'Audio file not found')",
  "'The file might have been deleted.'": "t('file_might_be_deleted', 'The file might have been deleted.')",
  "'Video recording module not available'": "t('video_recording_module_not_available', 'Video recording module not available')",
  "'No App Available'": "t('no_app_available', 'No App Available')",
  "'Share Error'": "t('share_error', 'Share Error')",
  "'Failed to share video'": "t('failed_to_share_video', 'Failed to share video')",
  "'Failed to share audio'": "t('failed_to_share_audio', 'Failed to share audio')",
  
  // Settings
  "'Settings'": "t('settings', 'Settings')",
  "'Camera Mode'": "t('camera_mode', 'Camera Mode')",
  "'Resolution'": "t('resolution', 'Resolution')",
  "'Preview Size'": "t('preview_size', 'Preview Size')",
  "'Auto Split'": "t('auto_split', 'Auto Split')",
  "'Password'": "t('password', 'Password')",
  "'Set Password'": "t('set_password', 'Set Password')",
  "'Change Icon'": "t('change_icon', 'Change Icon')",
  "'Save Location'": "t('save_location', 'Save Location')",
  "'Share App'": "t('share_app', 'Share App')",
  "'Privacy Policy'": "t('privacy_policy', 'Privacy Policy')",
  "'Language'": "t('language', 'Language')",
  "'Failed to save camera mode'": "t('failed_to_save_camera_mode', 'Failed to save camera mode')",
  "'Failed to save duration'": "t('failed_to_save_duration', 'Failed to save duration')",
  "'Failed to save resolution'": "t('failed_to_save_resolution', 'Failed to save resolution')",
  "'Failed to save preview size'": "t('failed_to_save_preview_size', 'Failed to save preview size')",
  "'Feature coming soon!'": "t('coming_soon', 'Feature coming soon!')",
  
  // Resolution
  "'SD Quality'": "t('sd_quality', 'SD Quality')",
  "'HD Quality'": "t('hd_quality', 'HD Quality')",
  "'Full HD Quality'": "t('full_hd_quality', 'Full HD Quality')",
  "'Standard Definition'": "t('standard_definition', 'Standard Definition')",
  "'High Definition (Default)'": "t('high_definition_default', 'High Definition (Default)')",
  "'Full High Definition (PRO)'": "t('full_high_definition_pro', 'Full High Definition (PRO)')",
  
  // Password
  "'Set App Password'": "t('set_app_password', 'Set App Password')",
  "'New Password'": "t('new_password', 'New Password')",
  "'Confirm Password'": "t('confirm_password', 'Confirm Password')",
  "'Passwords do not match'": "t('passwords_do_not_match', 'Passwords do not match')",
  "'Password too short (minimum 4 characters)'": "t('password_too_short', 'Password too short (minimum 4 characters)')",
  
  // Rename
  "'Rename'": "t('rename', 'Rename')",
  "'Please enter a valid name'": "t('enter_valid_name', 'Please enter a valid name')",
  
  // Video Actions
  "'Delete'": "t('delete', 'Delete')",
  "'Share'": "t('share', 'Share')",
  "'Confirm Delete'": "t('confirm_delete', 'Confirm Delete')",
  "'Are you sure you want to delete this video?'": "t('are_you_sure_delete_video', 'Are you sure you want to delete this video?')",
  "'Are you sure you want to delete this audio file?'": "t('are_you_sure_delete_audio', 'Are you sure you want to delete this audio file?')",
  
  // Edit Options
  "'Trim'": "t('trim', 'Trim')",
  "'Merge'": "t('merge', 'Merge')",
  "'Compress'": "t('compress', 'Compress')",
  "'Convert to Audio'": "t('convert_to_audio', 'Convert to Audio')",
  
  // Convert to Audio
  "'Video to Audio'": "t('video_to_audio', 'Video to Audio')",
  "'Converting to Audio'": "t('converting_to_audio', 'Converting to Audio')",
  "'Your audio has been exported'": "t('audio_exported', 'Your audio has been exported')",
  
  // Network
  "'No Internet Connection'": "t('no_internet_connection', 'No Internet Connection')",
  "'Connection Tips:'": "t('connection_tips', 'Connection Tips:')",
  "'• Check your WiFi or mobile data'": "t('check_wifi_data', '• Check your WiFi or mobile data')",
  "'• Move to a better signal area'": "t('move_to_better_signal', '• Move to a better signal area')",
  "'• Restart your WiFi router'": "t('restart_wifi_router', '• Restart your WiFi router')",
  
  // Preview Size Modal
  "'Chọn kích thước preview'": "t('choose_preview_size', 'Chọn kích thước preview')",
  "'small'": "t('small', 'small')",
  "'medium'": "t('medium', 'medium')",
  "'large'": "t('large', 'large')",
  
  // OnBoard
  "'Record video everywhere'": "t('record_video_everywhere', 'Record video everywhere')",
  "'Next'": "t('next', 'Next')",
  
  // IAP
  "'Best Value'": "t('best_value', 'Best Value')",
  "'Popular Choice'": "t('popular_choice', 'Popular Choice')",
  "'Try it out'": "t('try_it_out', 'Try it out')",
  "'Free for 3 days'": "t('free_for_3_days', 'Free for 3 days')",
  "'1 Year'": "t('year', '1 Year')",
  "'3 Months'": "t('months', '3 Months')",  
  "'1 Month'": "t('month', '1 Month')",
};

// Thêm import useTranslation vào đầu file nếu chưa có
function addTranslationImport(content) {
  if (content.includes('useTranslation')) {
    return content;
  }
  
  // Tìm dòng import cuối cùng
  const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
  if (importLines.length === 0) {
    return content;
  }
  
  const lastImportIndex = content.lastIndexOf('import');
  const nextLineIndex = content.indexOf('\n', lastImportIndex);
  
  return content.slice(0, nextLineIndex) + 
         "\nimport useTranslation from '../../hooks/useTranslation';" +
         content.slice(nextLineIndex);
}

// Thêm const { t } = useTranslation(); vào component
function addTranslationHook(content) {
  if (content.includes('useTranslation()')) {
    return content;
  }
  
  // Tìm component function
  const componentMatch = content.match(/const\s+(\w+)\s*=\s*\(\s*[^)]*\s*\)\s*=>\s*{/);
  if (!componentMatch) {
    return content;
  }
  
  const insertIndex = content.indexOf('{', componentMatch.index) + 1;
  return content.slice(0, insertIndex) + 
         "\n    const { t } = useTranslation();" +
         content.slice(insertIndex);
}

// Áp dụng text replacements
function applyTranslations(content) {
  let result = content;
  
  for (const [original, replacement] of Object.entries(TEXT_REPLACEMENTS)) {
    // Replace cả trong Alert.alert và <Text>
    result = result.replace(new RegExp(original.replace(/'/g, "\\'"), 'g'), replacement);
  }
  
  return result;
}

// Xử lý một file
function processFile(filePath) {
  try {
    console.log(`Processing: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip nếu đã có translation
    if (content.includes('useTranslation')) {
      console.log(`  Skipped: Already has translations`);
      return;
    }
    
    // Thêm import
    content = addTranslationImport(content);
    
    // Thêm hook
    content = addTranslationHook(content);
    
    // Áp dụng translations
    content = applyTranslations(content);
    
    // Ghi lại file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Updated successfully`);
    
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error.message);
  }
}

// Tìm tất cả files .js trong src/components
function findComponentFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.js') && !item.includes('test')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Main execution
function main() {
  console.log('🌍 Applying translations to all components...\n');
  
  const srcDir = path.join(__dirname, 'src', 'components');
  const files = findComponentFiles(srcDir);
  
  console.log(`Found ${files.length} component files:\n`);
  
  for (const file of files) {
    processFile(file);
  }
  
  console.log('\n🎉 Translation application complete!');
  console.log('\nNext steps:');
  console.log('1. Review the changes');
  console.log('2. Test the app');
  console.log('3. Add missing translations to Translations.js');
  console.log('4. Adjust import paths if needed');
}

if (require.main === module) {
  main();
}

module.exports = {
  processFile,
  findComponentFiles,
  TEXT_REPLACEMENTS
};