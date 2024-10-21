package com.expensify.chat;

import android.view.View;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewGroupManager;

public class MyCustomViewManager extends ViewGroupManager<MyCustomView> {

    @Override
    public String getName() {
        return "MyCustomView";
    }

    @Override
    protected MyCustomView createViewInstance(ThemedReactContext reactContext) {
        return new MyCustomView(reactContext, null);
    }

    @Override
    public void addView(MyCustomView parent, View child, int index) {
        parent.addView(child, index);
    }

    @Override
    public int getChildCount(MyCustomView parent) {
        return parent.getChildCount();
    }

    @Override
    public View getChildAt(MyCustomView parent, int index) {
        return parent.getChildAt(index);
    }

    @Override
    public void removeViewAt(MyCustomView parent, int index) {
        parent.removeViewAt(index);
    }
}