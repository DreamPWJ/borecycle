package com.offbye.cordova.alipay;

import java.util.HashMap;
import java.util.Map;

import org.json.JSONObject;

import android.text.TextUtils;

public class PayResult {
	private String resultStatus;
	private String result;
	private String memo;

	public PayResult(Map<String, String> rawResult) {
    		if (rawResult == null) {
    			return;
    		}

    		for (String key : rawResult.keySet()) {
    			if (TextUtils.equals(key, "resultStatus")) {
    				resultStatus = rawResult.get(key);
    			} else if (TextUtils.equals(key, "result")) {
    				result = rawResult.get(key);
    			} else if (TextUtils.equals(key, "memo")) {
    				memo = rawResult.get(key);
    			}
    		}
    	}

	@Override
	public String toString() {
		return "resultStatus={" + resultStatus + "};memo={" + memo
				+ "};result={" + result + "}";
	}

  public JSONObject toJson(){
        Map<String, String> payResultsMap = new HashMap<String, String>() {{
            put("resultStatus", resultStatus);
            put("memo", memo);
            put("result", result);
        }};
        return new JSONObject(payResultsMap);
    }

	private String gatValue(String content, String key) {
		String prefix = key + "={";
		return content.substring(content.indexOf(prefix) + prefix.length(),
				content.lastIndexOf("}"));
	}

	/**
  	 * @return the resultStatus
  	 */
  	public String getResultStatus() {
  		return resultStatus;
  	}

  	/**
  	 * @return the memo
  	 */
  	public String getMemo() {
  		return memo;
  	}

  	/**
  	 * @return the result
  	 */
  	public String getResult() {
  		return result;
  	}
}
